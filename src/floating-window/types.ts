import type { GooPointerDragEvent } from '../support/utils/pointerDrag.ts'

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
	/**
	 * Destroy.
	 */
	destroy(): void
	/**
	 * Flip horizontal.
	 */
	flipHorizontal(): void
	/**
	 * Focus.
	 */
	focus(): void
	/**
	 * Gets containment rect.
	 */
	getContainmentRect(): DOMRect
	/**
	 * Hide.
	 */
	hide(): boolean
	/**
	 * Checks whether open.
	 */
	isOpen(): boolean
	/**
	 * Restore.
	 */
	restore(): void
	/**
	 * Restore from storage.
	 */
	restoreFromStorage(): Promise<void>
	/**
	 * Sets alignment.
	 *
	 * @param position - position.
	 */
	setAlignment(position: GooFloatingWindowPosition): void
	/**
	 * Sets containment.
	 *
	 * @param containment - containment.
	 */
	setContainment(containment?: HTMLElement): void
	/**
	 * Show.
	 */
	show(): void
	/**
	 * Toggle.
	 */
	toggle(): void
}
