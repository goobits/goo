import type { GooLifecycleBag } from '../support/utils/lifecycleBag.ts'
import { createPointerDrag } from '../support/utils/pointerDrag.ts'
import type { GooPopoutPointerEvent } from './popoutTypes.ts'

const INTERACTIVE_DRAG_TARGET_SELECTOR = [
	'a[href]',
	'button',
	'input',
	'label',
	'select',
	'summary',
	'textarea',
	'[contenteditable]:not([contenteditable="false"])',
	'[role="button"]',
	'[role="checkbox"]',
	'[role="combobox"]',
	'[role="link"]',
	'[role="listbox"]',
	'[role="menuitem"]',
	'[role="option"]',
	'[role="radio"]',
	'[role="scrollbar"]',
	'[role="searchbox"]',
	'[role="slider"]',
	'[role="spinbutton"]',
	'[role="switch"]',
	'[role="tab"]',
	'[role="textbox"]',
	'[data-goo-popout-no-drag]'
].join(',')

export function setupPopoutEventHandlers({
	clickToClose,
	close,
	dragToMove,
	element,
	getArrowElement,
	isClickInsidePopout,
	isDestroying,
	isOpen,
	lifecycle,
	reposition
}: {
	clickToClose: boolean | ((event: GooPopoutPointerEvent, isInsidePopout: boolean) => boolean)
	close(): Promise<void>
	dragToMove: boolean
	element: HTMLElement
	getArrowElement(): HTMLElement | null
	isClickInsidePopout(target: HTMLElement): boolean
	isDestroying(): boolean
	isOpen(): boolean
	lifecycle: GooLifecycleBag
	reposition(): void
}): void {
	if (clickToClose) {
		const handlePointerDown = (event: PointerEvent) => {
			if (!isOpen() || isDestroying()) return

			const pointerEvent = toGooPointerEvent(event)
			const clickedElement = pointerEvent.target as HTMLElement
			const isInsidePopout = isClickInsidePopout(clickedElement)

			if (typeof clickToClose === 'function') {
				if (clickToClose(pointerEvent, isInsidePopout)) {
					void close()
				}
			} else if (!isInsidePopout) {
				void close()
			}
		}

		// Capture is attached after the opening event has already reached its
		// trigger, so it cannot self-close but is ready for the very next press.
		lifecycle.listen(document, 'pointerdown', handlePointerDown, { capture: true })
		element.setAttribute('data-click-to-close-armed', '')
	}

	lifecycle.listen(window, 'resize', () => {
		if (isOpen()) reposition()
	})

	lifecycle.listen(element, 'wheel', event => handleWheel(event, element), { passive: false })

	if (dragToMove) {
		setupDragToMove(element, getArrowElement, lifecycle)
	}

}

function handleWheel(event: WheelEvent, element: HTMLElement): void {
	const scrollContainer = getScrollableWheelContainer(event, element)
	if (!scrollContainer) {
		event.stopPropagation()
		return
	}

	const { scrollTop, scrollHeight, clientHeight } = scrollContainer
	const atTop = scrollTop === 0
	const atBottom = scrollTop + clientHeight >= scrollHeight

	if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
		event.preventDefault()
	}
	event.stopPropagation()
}

function getScrollableWheelContainer(event: WheelEvent, root: HTMLElement): HTMLElement | null {
	let node = event.target instanceof HTMLElement ? event.target : null
	while (node && node !== root) {
		const style = window.getComputedStyle(node)
		const canScrollY = /auto|scroll|overlay/.test(style.overflowY)
		if (canScrollY && node.scrollHeight > node.clientHeight) {
			return node
		}
		node = node.parentElement
	}

	return root.querySelector('.goo-popout__content') as HTMLElement | null
}

function setupDragToMove(
	element: HTMLElement,
	getArrowElement: () => HTMLElement | null,
	lifecycle: GooLifecycleBag
): void {
	let startX: number, startY: number, startLeft: number, startTop: number

	const handler = createPointerDrag(
		element,
		event => {
			if (event.START) {
				if (isInteractiveDragTarget(event.originalEvent.target)) return false
				const rect = element.getBoundingClientRect()
				startX = event.clientX
				startY = event.clientY
				startLeft = rect.left
				startTop = rect.top
			}

			if (!event.DOWN) return
			const dx = event.clientX - startX
			const dy = event.clientY - startY
			if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5) return

			event.preventDefault()

			element.style.left = `${ startLeft + dx }px`
			element.style.top = `${ startTop + dy }px`

			getArrowElement()?.classList.add('goo-popout__arrow--hidden')
			return
		},
		{ ignoreTouch: true }
	)

	lifecycle.add(handler)
}

function isInteractiveDragTarget(target: EventTarget | null): boolean {
	return target instanceof Element
		&& Boolean(target.closest(INTERACTIVE_DRAG_TARGET_SELECTOR))
}

function toGooPointerEvent(event: PointerEvent): GooPopoutPointerEvent {
	return {
		originalEvent: event,
		target: event.target,
		clientX: event.clientX,
		clientY: event.clientY,
		isTouch: event.pointerType === 'touch',
		preventDefault: () => event.preventDefault(),
		stopPropagation: () => event.stopPropagation()
	}
}
