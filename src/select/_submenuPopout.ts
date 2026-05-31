import { createGooPopout, type GooPopoutInstance } from '../popout/index.js'
import type { GooSelectOption } from './types.js'

const SUBMENU_TRANSITION_MS = 240

type Direction = 'down' | 'up'
type RenderOptionsList = (options: GooSelectOption[], container: HTMLElement) => void
type SubmenuElements = {
	$frame: HTMLElement
	$viewport: HTMLElement
}

export class SubmenuPopoutController {
	#renderOptionsList: RenderOptionsList
	#popout: GooPopoutInstance | null = null
	#activeId: string | null = null
	#activeOwner: HTMLElement | null = null
	#transitionCleanup: (() => void) | null = null
	#transitionFrame = 0
	#transitionToken = 0

	constructor(renderOptionsList: RenderOptionsList) {
		this.#renderOptionsList = renderOptionsList
	}

	get opened(): boolean {
		return Boolean(this.#popout?.opened)
	}

	open($item: HTMLElement, option: GooSelectOption): void {
		const submenuId = option.id ?? ''
		if (this.#popout?.opened && this.#activeId === submenuId) {
			this.#popout.updatePosition($item)
			return
		}

		const $nextSubmenu = this.#createSubmenuContent(option.options || [])
		if (this.#popout?.opened) {
			const direction = this.#getSwitchDirection($item)
			this.#activeId = submenuId
			this.#activeOwner = $item
			this.#replaceSubmenuContent($item, $nextSubmenu, direction)
			return
		}

		this.#activeId = submenuId
		this.#activeOwner = $item
		this.#popout = createGooPopout({
			$content: this.#createSubmenuFrame($nextSubmenu),
			$parent: document.body,
			className: 'goo-select-submenu-popout goo-select-submenu-popout--morph',
			clickToClose: false,
			escapeToClose: false,
			showArrow: true,
			showBackdrop: false,
			at: $item,
			align: 'left to right',
			offset: { x: 8, y: 0 }
		})
	}

	close(): void {
		this.#finishTransition()
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
			popout?.$content?.replaceChildren(this.#createSubmenuFrame($nextSubmenu))
			popout?.updatePosition($item)
			return
		}

		const { $frame, $viewport } = elements
		const previousRect = $frame.getBoundingClientRect()
		this.#cancelTransition()
		const $previousSubmenu = $viewport.querySelector<HTMLElement>(':scope > .goo-select__submenu')
		if (!$previousSubmenu || prefersReducedMotion()) {
			$viewport.replaceChildren($nextSubmenu)
			popout.updatePosition($item)
			return
		}

		const previousSize = measureFrame($frame)
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

		popout.updatePosition($item)
		const token = ++this.#transitionToken

		let finished = false
		let onTransitionEnd: ((event: TransitionEvent) => void) | null = null
		const finish = () => {
			if (finished || token !== this.#transitionToken) return
			finished = true
			if (onTransitionEnd) {
				$frame.removeEventListener('transitionend', onTransitionEnd)
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
			popout.reposition()
			this.#transitionCleanup = null
		}
		const timeout = setTimeout(finish, SUBMENU_TRANSITION_MS + 80)
		onTransitionEnd = (event: TransitionEvent) => {
			if (event.target === $frame && (event.propertyName === 'width' || event.propertyName === 'height')) {
				finish()
			}
		}
		$frame.addEventListener('transitionend', onTransitionEnd)

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
			popout.updatePosition($item)
		})

		this.#transitionCleanup = () => {
			$frame.removeEventListener('transitionend', onTransitionEnd)
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

	#cancelTransition(): void {
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
		const $frame = this.#popout?.$content?.querySelector<HTMLElement>(':scope > .goo-select__submenu-frame') ?? null
		const $viewport = $frame?.querySelector<HTMLElement>(':scope > .goo-select__submenu-viewport') ?? null
		return $frame && $viewport ? { $frame, $viewport } : null
	}

	#getSwitchDirection($item: HTMLElement): Direction {
		if (!this.#activeOwner) return 'down'

		return this.#activeOwner.compareDocumentPosition($item) & Node.DOCUMENT_POSITION_FOLLOWING
			? 'down'
			: 'up'
	}
}

function measureFrame(element: HTMLElement): { height: number; width: number } {
	const rect = element.getBoundingClientRect()
	return {
		height: Math.max(1, Math.ceil(rect.height || element.scrollHeight || element.offsetHeight)),
		width: Math.max(1, Math.ceil(rect.width || element.scrollWidth || element.offsetWidth))
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
