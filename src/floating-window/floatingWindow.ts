import './FloatingWindow.css'

import { createPointerDrag, type GooPointerDragHandle } from '../utils/pointerDrag.ts'
import type {
	GooFloatingWindow,
	GooFloatingWindowOptions,
	GooFloatingWindowPosition,
	GooFloatingWindowSettings
} from './types.ts'

let zIndexGlobal = 101
const focusedWindows: GooFloatingWindow[] = []

/**
 * Create a draggable, persisted floating window around an existing element.
 * @param options - Floating-window element, persistence, and positioning options.
 * @returns Imperative floating-window controller.
 */
export function createGooFloatingWindow(options: GooFloatingWindowOptions): GooFloatingWindow {
	const {
		containment,
		element,
		handle,
		id,
		onDrag,
		position = 'top left',
		storage
	} = options
	const [ vAlign, hAlign ] = position.split(' ') as ['top' | 'bottom', 'left' | 'right']
	const settings: GooFloatingWindowSettings = {
		bottom: options.bottom ?? 0,
		closeable: options.closeable ?? true,
		display: normalizeDisplay(options.display) ?? 'block',
		format: options.format ?? '%',
		hAlign,
		index: options.index,
		left: options.left ?? 0,
		right: options.right ?? 0,
		top: options.top ?? 0,
		vAlign
	}

	let containmentElement = containment
	let dragHandler: GooPointerDragHandle | undefined
	let ready = Promise.resolve()

	element.classList.add('goo-floating-window')
	element.dataset.gooFloatingWindow = id

	if (settings.format === 'px') {
		convertPixelsToPercentages()
		settings.format = '%'
	}

	const api: GooFloatingWindow = {
		element,
		get ready() {
			return ready
		},
		settings,
		destroy,
		flipHorizontal,
		focus,
		getContainmentRect,
		hide,
		isOpen,
		restore,
		restoreFromStorage,
		setAlignment,
		setContainment,
		show,
		toggle
	}

	attachDrag()
	ready = restoreFromStorage()

	return api

	function attachDrag(): void {
		const dragTarget = resolveDragHandle(handle, element)
		dragHandler = createPointerDrag(dragTarget, event => {
			const env = event.env

			if (event.START) {
				const rect = element.getBoundingClientRect()
				env.startLeft = rect.left
				env.startTop = rect.top
				element.classList.add('goo-floating-window--dragging')
				focus()
				onDrag?.(event, api)
			}

			if (!event.hasMoved(2)) {
				if (event.END) {
					element.classList.remove('goo-floating-window--dragging')
				}
				return
			}

			event.preventDefault()

			if (event.DOWN) {
				const parentRect = getParentRect()
				const nextLeft = Number(env.startLeft ?? 0) + event.x
				const nextTop = Number(env.startTop ?? 0) + event.y
				element.style.left = `${ nextLeft - parentRect.left }px`
				element.style.top = `${ nextTop - parentRect.top }px`
				element.style.right = ''
				element.style.bottom = ''
			}

			recordFromElement()
			restore()
			onDrag?.(event, api)

			if (event.END) {
				element.classList.remove('goo-floating-window--dragging')
			}
		})
	}

	function convertPixelsToPercentages(): void {
		const containmentRect = getContainmentRect()

		// Fractions are expressed against the full containment dimension to match
		// restore(), which multiplies them back by containmentRect.width/height.
		const width = Math.max(1, containmentRect.width)
		const height = Math.max(1, containmentRect.height)

		if (settings.vAlign === 'bottom') {
			settings.bottom = (settings.bottom ?? 0) / height
		} else {
			settings.top = (settings.top ?? 0) / height
		}

		if (settings.hAlign === 'right') {
			settings.right = (settings.right ?? 0) / width
		} else {
			settings.left = (settings.left ?? 0) / width
		}
	}

	function destroy(): void {
		dragHandler?.detach?.()
		unfocus()
		element.classList.remove('goo-floating-window', 'goo-floating-window--dragging', 'opened')
		delete element.dataset.gooFloatingWindow
	}

	function flipHorizontal(): void {
		const rect = element.getBoundingClientRect()
		const containmentRect = getContainmentRect()

		if (settings.hAlign === 'right') {
			settings.left = clamp((rect.left - containmentRect.left) / Math.max(1, containmentRect.width), 0, 1)
			settings.hAlign = 'left'
			settings.right = 0
		} else {
			settings.right = clamp((containmentRect.right - rect.right) / Math.max(1, containmentRect.width), 0, 1)
			settings.hAlign = 'right'
			settings.left = 0
		}

		record()
		restore()
	}

	function focus(): void {
		const index = ++zIndexGlobal
		zIndexGlobal = Math.max(zIndexGlobal, index)
		settings.index = index
		element.style.zIndex = String(settings.index)
		const previousIndex = focusedWindows.indexOf(api)
		if (previousIndex >= 0) {
			focusedWindows.splice(previousIndex, 1)
		}
		focusedWindows.push(api)
		record()
	}

	function getContainmentRect(): DOMRect {
		return containmentElement?.getBoundingClientRect() ?? document.documentElement.getBoundingClientRect()
	}

	function getParentRect(): DOMRect {
		return (element.offsetParent as HTMLElement | null)?.getBoundingClientRect()
			?? element.parentElement?.getBoundingClientRect()
			?? document.documentElement.getBoundingClientRect()
	}

	function hide(): boolean {
		if (settings.closeable === false) return false
		settings.display = 'none'
		element.classList.remove('opened')
		element.style.display = 'none'
		unfocus()
		record()
		return true
	}

	function isOpen(): boolean {
		return String(settings.display).toLowerCase() === 'block'
			&& element.classList.contains('opened')
			&& element.style.display !== 'none'
	}

	function record(): void {
		void storage?.set(id, toPlainSettings(settings))
	}

	function recordFromElement(): void {
		const rect = element.getBoundingClientRect()
		const containmentRect = getContainmentRect()

		if (settings.vAlign === 'bottom') {
			settings.bottom = clamp((containmentRect.bottom - rect.bottom) / Math.max(1, containmentRect.height), 0, 1)
		} else {
			settings.top = clamp((rect.top - containmentRect.top) / Math.max(1, containmentRect.height), 0, 1)
		}

		if (settings.hAlign === 'right') {
			settings.right = clamp((containmentRect.right - rect.right) / Math.max(1, containmentRect.width), 0, 1)
		} else {
			settings.left = clamp((rect.left - containmentRect.left) / Math.max(1, containmentRect.width), 0, 1)
		}

		record()
	}

	function restore(): void {
		if (String(settings.display).toLowerCase() !== 'block') {
			element.style.display = 'none'
			element.classList.remove('opened')
			return
		}

		const containmentRect = getContainmentRect()
		const parentRect = getParentRect()
		const elementRect = element.getBoundingClientRect()
		const maxLeft = Math.max(0, 1 - elementRect.width / Math.max(1, containmentRect.width))
		const maxTop = Math.max(0, 1 - elementRect.height / Math.max(1, containmentRect.height))

		element.style.display = 'block'

		if (settings.hAlign === 'right') {
			const right = clamp(settings.right ?? 0, 0, maxLeft)
			element.style.left = ''
			element.style.right = `${ Math.max(0, right * containmentRect.width + parentRect.right - containmentRect.right) }px`
		} else {
			const left = clamp(settings.left ?? 0, 0, maxLeft)
			element.style.left = `${ Math.max(0, left * containmentRect.width + containmentRect.left - parentRect.left) }px`
			element.style.right = ''
		}

		if (settings.vAlign === 'bottom') {
			const bottom = clamp(settings.bottom ?? 0, 0, maxTop)
			element.style.top = ''
			element.style.bottom = `${ Math.max(0, bottom * containmentRect.height + parentRect.bottom - containmentRect.bottom) }px`
		} else {
			const top = clamp(settings.top ?? 0, 0, maxTop)
			element.style.top = `${ Math.max(0, top * containmentRect.height + containmentRect.top - parentRect.top) }px`
			element.style.bottom = ''
		}

		if (settings.index) {
			element.style.zIndex = String(settings.index)
			zIndexGlobal = Math.max(zIndexGlobal, settings.index)
		}

		element.classList.add('opened')
	}

	async function restoreFromStorage(): Promise<void> {
		const persisted = normalizeFloatingWindowSettings(await storage?.get(id))
		if (persisted) {
			delete persisted.closeable
			Object.assign(settings, persisted)
		}
		restore()
	}

	function setAlignment(position: GooFloatingWindowPosition): void {
		const [ nextVAlign, nextHAlign ] = position.split(' ') as ['top' | 'bottom', 'left' | 'right']
		if (settings.hAlign !== nextHAlign) {
			flipHorizontal()
		}
		settings.vAlign = nextVAlign
		settings.hAlign = nextHAlign
		record()
		restore()
	}

	function setContainment(nextContainment?: HTMLElement): void {
		containmentElement = nextContainment
		restore()
	}

	function show(): void {
		settings.display = 'block'
		focus()
		restore()
	}

	function toggle(): void {
		if (isOpen()) {
			hide()
		} else {
			show()
		}
	}

	function unfocus(): void {
		const focusIndex = focusedWindows.indexOf(api)
		if (focusIndex >= 0) {
			focusedWindows.splice(focusIndex, 1)
		}
	}
}

/**
 * Normalize persisted floating-window settings.
 * @param value - Stored value from an application storage adapter.
 * @returns Plain settings object, or null when invalid.
 */
export function normalizeFloatingWindowSettings(value: unknown): GooFloatingWindowSettings | null {
	if (!value) {
		return null
	}

	if (typeof value === 'string') {
		try {
			value = JSON.parse(value)
		} catch {
			return null
		}
	}

	if (typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value as GooFloatingWindowSettings
}

/**
 * Return the topmost connected focused Goo floating window.
 * @returns Focused floating window, or undefined when none are focused.
 */
function getFocusedGooFloatingWindow(): GooFloatingWindow | undefined {
	for (let index = focusedWindows.length - 1; index >= 0; index--) {
		const floatingWindow = focusedWindows[index]
		if (floatingWindow.element.isConnected) {
			return floatingWindow
		}
		focusedWindows.splice(index, 1)
	}
	return undefined
}

/**
 * Hide the focused Goo floating window if it is closeable.
 * @returns True when a focused floating window was hidden.
 */
export function hideFocusedGooFloatingWindow(): boolean {
	let floatingWindow = getFocusedGooFloatingWindow()
	while (floatingWindow) {
		if (floatingWindow.hide()) {
			return true
		}
		focusedWindows.pop()
		floatingWindow = getFocusedGooFloatingWindow()
	}
	return false
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

function normalizeDisplay(display: unknown): string | undefined {
	if (display === true) return 'block'
	if (display === false) return 'none'
	if (typeof display === 'string') return display
	return undefined
}

function resolveDragHandle(handle: HTMLElement | string | undefined, element: HTMLElement): HTMLElement {
	if (handle instanceof HTMLElement) {
		return handle
	}

	if (typeof handle === 'string') {
		return element.ownerDocument.querySelector<HTMLElement>(handle) ?? element
	}

	return element
}

function toPlainSettings(settings: GooFloatingWindowSettings): GooFloatingWindowSettings {
	return {
		bottom: settings.bottom,
		closeable: settings.closeable,
		display: settings.display,
		format: '%',
		hAlign: settings.hAlign,
		index: settings.index,
		left: settings.left,
		right: settings.right,
		top: settings.top,
		vAlign: settings.vAlign
	}
}
