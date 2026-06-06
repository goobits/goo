import { createGooPopout, type GooPopoutInstance } from '../popout/index.ts'
import type { PositionResult } from '../support/positioning/index.ts'
import { getElementTextDirection } from './selectDom.ts'
import type { GooSelectOption } from './types.ts'

const SUBMENU_TRANSITION_MS = 420
const SUBMENU_SIDE_CLASSES = [
	'goo-select__option--submenu-open-left',
	'goo-select__option--submenu-open-right'
]

type Direction = 'down' | 'up'
type RenderOptionsList = (options: GooSelectOption[], container: HTMLElement) => void
type SubmenuElements = {
	$frame: HTMLElement
	$viewport: HTMLElement
}
type SubmenuBoundaryHandlers = {
	onMouseEnter?: () => void
	onMouseLeave?: (event: MouseEvent) => void
}

export class SubmenuPopoutController {
	#renderOptionsList: RenderOptionsList
	#boundaryHandlers: SubmenuBoundaryHandlers
	#popout: GooPopoutInstance | null = null
	#activeId: string | null = null
	#activeOwner: HTMLElement | null = null
	#boundaryCleanup: (() => void) | null = null
	#transitionCleanup: (() => void) | null = null
	#transitionFrame = 0
	#transitionToken = 0

	constructor(renderOptionsList: RenderOptionsList, boundaryHandlers: SubmenuBoundaryHandlers = {}) {
		this.#renderOptionsList = renderOptionsList
		this.#boundaryHandlers = boundaryHandlers
	}

	isOpen(): boolean {
		return Boolean(this.#popout?.isOpen())
	}

	containsElement(target: EventTarget | null): boolean {
		return target instanceof Node && Boolean(this.#popout?.element?.contains(target))
	}

	open($item: HTMLElement, option: GooSelectOption): void {
		const submenuId = option.id ?? ''
		if (this.#popout?.isOpen() && this.#activeId === submenuId) {
			this.#setActiveOwner($item)
			this.#updatePopoutPosition($item)
			return
		}

		const $nextSubmenu = this.#createSubmenuContent(option.options || [])
		if (this.#popout?.isOpen()) {
			const direction = this.#getSwitchDirection($item)
			this.#activeId = submenuId
			this.#setActiveOwner($item)
			this.#replaceSubmenuContent($item, $nextSubmenu, direction)
			return
		}

		this.#activeId = submenuId
		this.#setActiveOwner($item)
		const textDirection = getElementTextDirection($item)
		this.#popout = createGooPopout({
			content: this.#createSubmenuFrame($nextSubmenu),
			parentElement: document.body,
			className: 'goo-select-submenu-popout goo-select-submenu-popout--morph',
			clickToClose: false,
			escapeToClose: false,
			showArrow: true,
			showBackdrop: false,
			at: $item,
			align: 'left to right',
			offset: { x: 8, y: 0 },
			rtl: textDirection === 'rtl',
			attributes: { dir: textDirection },
			onPosition: ({ position }) => this.#syncActiveOwnerPlacement(position)
		})
		this.#bindBoundaryEvents()
	}

	close(): void {
		this.#finishTransition()
		this.#boundaryCleanup?.()
		this.#boundaryCleanup = null
		this.#clearOwnerPlacement(this.#activeOwner)
		this.#popout?.destroy()
		this.#popout = null
		this.#activeId = null
		this.#activeOwner = null
	}

	#createSubmenuFrame($submenu: HTMLElement): HTMLElement {
		const $frame = document.createElement('div')
		$frame.className = 'goo-select__submenu-frame'
		const $viewport = document.createElement('div')
		$viewport.className = 'goo-select__submenu-viewport'
		$viewport.appendChild($submenu)
		$frame.appendChild($viewport)
		return $frame
	}

	#createSubmenuContent(options: GooSelectOption[]): HTMLElement {
		const $submenuContent = document.createElement('div')
		$submenuContent.className = 'goo-select__submenu'
		$submenuContent.setAttribute('role', 'listbox')
		this.#renderOptionsList(options, $submenuContent)
		return $submenuContent
	}

	#replaceSubmenuContent($item: HTMLElement, $nextSubmenu: HTMLElement, direction: Direction): void {
		const popout = this.#popout
		const elements = this.#getElements()

		if (!popout || !elements) {
			popout?.contentElement?.replaceChildren(this.#createSubmenuFrame($nextSubmenu))
			this.#updatePopoutPosition($item)
			return
		}

		const { $frame, $viewport } = elements
		const previousRect = $frame.getBoundingClientRect()
		// Capture the current rendered size before tearing down any in-flight
		// transition. Interrupting a morph mid-flight must continue from where the
		// frame visually is, not snap to the natural content size that settling exposes.
		const previousSize = measureElement($frame)
		this.#finishTransition()
		const $previousSubmenu = $viewport.querySelector<HTMLElement>(':scope > .goo-select__submenu')
		if (!$previousSubmenu || prefersReducedMotion()) {
			$viewport.replaceChildren($nextSubmenu)
			this.#updatePopoutPosition($item)
			return
		}

		$frame.classList.add('goo-select__submenu-frame--morph')
		$frame.style.width = `${ previousSize.width }px`
		$frame.style.height = `${ previousSize.height }px`

		$nextSubmenu.classList.add('goo-select__submenu--measure')
		$viewport.appendChild($nextSubmenu)
		const nextSize = measureFrameForSubmenu($frame, $viewport, $nextSubmenu)
		$nextSubmenu.classList.remove('goo-select__submenu--measure')

		const directionClass = `goo-select__submenu--${ direction }`
		$previousSubmenu.classList.add('goo-select__submenu--leaving', directionClass)
		$previousSubmenu.setAttribute('aria-hidden', 'true')
		$nextSubmenu.classList.add('goo-select__submenu--entering', directionClass)
		forceLayout($nextSubmenu)
		forceLayout($previousSubmenu)

		this.#updatePopoutPosition($item)
		const token = ++this.#transitionToken

		let finished = false
		let onTransitionEnd: ((event: TransitionEvent) => void) | null = null
		const finish = () => {
			if (finished || token !== this.#transitionToken) return
			finished = true
			if (onTransitionEnd) {
				$nextSubmenu.removeEventListener('transitionend', onTransitionEnd)
			}
			$previousSubmenu.remove()
			$nextSubmenu.classList.remove(
				'goo-select__submenu--entering',
				'goo-select__submenu--entering-active',
				'goo-select__submenu--down',
				'goo-select__submenu--up'
			)
			$nextSubmenu.removeAttribute('aria-hidden')
			$frame.classList.remove('goo-select__submenu-frame--morph')
			$frame.style.removeProperty('width')
			$frame.style.removeProperty('height')
			$frame.style.removeProperty('transform')
			this.#transitionCleanup = null
		}
		// Finish when the new content has finished sliding in (the last visible phase),
		// not when opacity ends -- opacity is slightly shorter than the slide.
		const timeout = setTimeout(finish, SUBMENU_TRANSITION_MS + 80)
		onTransitionEnd = (event: TransitionEvent) => {
			if (event.target === $nextSubmenu && event.propertyName === 'transform') {
				finish()
			}
		}
		$nextSubmenu.addEventListener('transitionend', onTransitionEnd)

		this.#transitionFrame = requestAnimationFrame(() => {
			if (token !== this.#transitionToken) return
			this.#transitionFrame = 0
			const nextRect = $frame.getBoundingClientRect()
			const dx = previousRect.left - nextRect.left
			const dy = previousRect.top - nextRect.top
			if (dx || dy) {
				// FLIP invert: snap to the previous position with no transition, then play to 0.
				$frame.style.transition = 'none'
				$frame.style.transform = `translate(${ dx }px, ${ dy }px)`
				forceLayout($frame)
				$frame.style.removeProperty('transition')

				requestAnimationFrame(() => {
					if (token !== this.#transitionToken) return
					$frame.style.transform = 'translate(0, 0)'
				})
			}

			$frame.style.width = `${ nextSize.width }px`
			$frame.style.height = `${ nextSize.height }px`
			$previousSubmenu.classList.add('goo-select__submenu--leaving-active')
			$nextSubmenu.classList.add('goo-select__submenu--entering-active')
			this.#updatePopoutPosition($item)
		})

		this.#transitionCleanup = () => {
			$nextSubmenu.removeEventListener('transitionend', onTransitionEnd)
			clearTimeout(timeout)
			this.#settleInterruptedTransition($frame, $viewport)
		}
	}

	#finishTransition(): void {
		this.#transitionToken += 1
		if (this.#transitionFrame) {
			cancelAnimationFrame(this.#transitionFrame)
			this.#transitionFrame = 0
		}

		this.#transitionCleanup?.()
		this.#transitionCleanup = null
	}

	#settleInterruptedTransition($frame: HTMLElement, $viewport: HTMLElement): void {
		const $current = $viewport.querySelector<HTMLElement>(':scope > .goo-select__submenu--entering')
			?? $viewport.querySelector<HTMLElement>(':scope > .goo-select__submenu:not([aria-hidden="true"])')
			?? $viewport.querySelector<HTMLElement>(':scope > .goo-select__submenu')
		if (!$current) return

		$viewport.replaceChildren($current)
		$current.removeAttribute('aria-hidden')
		$current.classList.remove(
			'goo-select__submenu--entering',
			'goo-select__submenu--entering-active',
			'goo-select__submenu--leaving',
			'goo-select__submenu--leaving-active',
			'goo-select__submenu--down',
			'goo-select__submenu--up'
		)
		$frame.classList.remove('goo-select__submenu-frame--morph')
		$frame.style.removeProperty('width')
		$frame.style.removeProperty('height')
		$frame.style.removeProperty('transform')
	}

	#getElements(): SubmenuElements | null {
		const $frame = this.#popout?.contentElement?.querySelector<HTMLElement>(':scope > .goo-select__submenu-frame') ?? null
		const $viewport = $frame?.querySelector<HTMLElement>(':scope > .goo-select__submenu-viewport') ?? null
		return $frame && $viewport ? { $frame, $viewport } : null
	}

	#bindBoundaryEvents(): void {
		const element = this.#popout?.element
		if (!element || this.#boundaryCleanup) return

		const handleMouseEnter = () => this.#boundaryHandlers.onMouseEnter?.()
		const handleMouseLeave = (event: MouseEvent) => this.#boundaryHandlers.onMouseLeave?.(event)
		element.addEventListener('mouseenter', handleMouseEnter)
		element.addEventListener('mouseleave', handleMouseLeave)
		this.#boundaryCleanup = () => {
			element.removeEventListener('mouseenter', handleMouseEnter)
			element.removeEventListener('mouseleave', handleMouseLeave)
		}
	}

	#setActiveOwner($item: HTMLElement): void {
		if (this.#activeOwner === $item) return
		this.#clearOwnerPlacement(this.#activeOwner)
		this.#activeOwner = $item
	}

	#clearOwnerPlacement($item: HTMLElement | null): void {
		$item?.classList.remove(...SUBMENU_SIDE_CLASSES)
		$item?.removeAttribute('data-submenu-side')
	}

	#syncActiveOwnerPlacement(position: PositionResult | null = this.#popout?.position ?? null): void {
		const side = getSubmenuSide(position)
		if (!this.#activeOwner || !side) return

		this.#clearOwnerPlacement(this.#activeOwner)
		this.#activeOwner.dataset.submenuSide = side
		this.#activeOwner.classList.add(`goo-select__option--submenu-open-${ side }`)
	}

	#updatePopoutPosition($item: HTMLElement): void {
		if (!this.#popout) return
		this.#popout.updatePosition($item)
		this.#popout.reposition()
	}

	#getSwitchDirection($item: HTMLElement): Direction {
		if (!this.#activeOwner) return 'down'

		return this.#activeOwner.compareDocumentPosition($item) & Node.DOCUMENT_POSITION_FOLLOWING
			? 'down'
			: 'up'
	}
}

function measureFrameForSubmenu(
	$frame: HTMLElement,
	$viewport: HTMLElement,
	$submenu: HTMLElement
): { height: number; width: number } {
	const submenuSize = measureElement($submenu)
	const frameStyle = getComputedStyle($frame)
	const viewportStyle = getComputedStyle($viewport)
	const chromeWidth =
		px(frameStyle.borderLeftWidth) +
		px(frameStyle.borderRightWidth) +
		px(viewportStyle.paddingLeft) +
		px(viewportStyle.paddingRight) +
		px(viewportStyle.borderLeftWidth) +
		px(viewportStyle.borderRightWidth)
	const chromeHeight =
		px(frameStyle.borderTopWidth) +
		px(frameStyle.borderBottomWidth) +
		px(viewportStyle.paddingTop) +
		px(viewportStyle.paddingBottom) +
		px(viewportStyle.borderTopWidth) +
		px(viewportStyle.borderBottomWidth)
	const maxHeight = px(frameStyle.maxHeight) || px(viewportStyle.maxHeight)
	const minWidth = px(frameStyle.minWidth)
	const height = submenuSize.height + chromeHeight
	const width = submenuSize.width + chromeWidth

	return {
		height: Math.max(1, Math.ceil(maxHeight > 0 ? Math.min(height, maxHeight) : height)),
		width: Math.max(1, Math.ceil(Math.max(width, minWidth)))
	}
}

function measureElement(element: HTMLElement): { height: number; width: number } {
	const rect = element.getBoundingClientRect()
	return {
		height: Math.max(1, Math.ceil(rect.height || element.scrollHeight || element.offsetHeight)),
		width: Math.max(1, Math.ceil(rect.width || element.scrollWidth || element.offsetWidth))
	}
}

function px(value: string): number {
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function prefersReducedMotion(): boolean {
	return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function forceLayout(element: HTMLElement): void {
	void element.offsetWidth
}

function getSubmenuSide(position: PositionResult | null): 'left' | 'right' | null {
	if (position?.arrowPosition === 'left') return 'right'
	if (position?.arrowPosition === 'right') return 'left'
	return null
}
