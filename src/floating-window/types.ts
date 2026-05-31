import type { GooPointerDragEvent } from '../utils/pointerDrag.js'

/**
 * Horizontal floating-window anchor.
 */
export type GooFloatingWindowHorizontalAlign = 'left' | 'right'

/**
 * Vertical floating-window anchor.
 */
export type GooFloatingWindowVerticalAlign = 'top' | 'bottom'

/**
 * Floating-window anchor string.
 */
export type GooFloatingWindowPosition =
	| 'top left'
	| 'top right'
	| 'bottom left'
	| 'bottom right'

/**
 * Persisted floating-window coordinates.
 */
export interface GooFloatingWindowSettings {
	bottom?: number
	closeable?: boolean
	display?: string
	format?: '%' | 'px'
	hAlign?: GooFloatingWindowHorizontalAlign
	index?: number
	left?: number
	right?: number
	top?: number
	vAlign?: GooFloatingWindowVerticalAlign
}

/**
 * Storage adapter used by floating windows.
 */
export interface GooFloatingWindowStorage {

	/**
	 * Read persisted settings for a window id.
	 * @param id - Stable storage key.
	 * @returns Persisted settings or undefined when no settings exist.
	 */
	get(id: string): Promise<unknown> | unknown

	/**
	 * Persist settings for a window id.
	 * @param id - Stable storage key.
	 * @param value - Plain settings object.
	 */
	set(id: string, value: GooFloatingWindowSettings): Promise<void> | void
}

/**
 * Floating-window creation options.
 */
export interface GooFloatingWindowOptions extends GooFloatingWindowSettings {
	containment?: HTMLElement
	element: HTMLElement
	handle?: HTMLElement | string
	id: string
	onDrag?: (event: GooPointerDragEvent, floatingWindow: GooFloatingWindow) => unknown
	position?: GooFloatingWindowPosition
	storage?: GooFloatingWindowStorage
}

/**
 * Imperative floating-window controller.
 */
export interface GooFloatingWindow {
	element: HTMLElement
	ready: Promise<void>
	settings: GooFloatingWindowSettings
	destroy(): void
	flipHorizontal(): void
	focus(): void
	getContainmentRect(): DOMRect
	hide(): boolean
	isOpen(): boolean
	restore(): void
	restoreFromStorage(): Promise<void>
	setAlignment(position: GooFloatingWindowPosition): void
	setContainment(containment?: HTMLElement): void
	show(): void
	toggle(): void
}
