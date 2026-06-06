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
	display?: 'block' | 'none' | boolean
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
	get(id: string): Promise<GooFloatingWindowSettings | undefined> | GooFloatingWindowSettings | undefined

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
	/** Destroy the floating-window behavior and leave the element in place. */
	destroy(): void
	/** Bring this window to the top of the floating-window stack. */
	focus(): void
	/** Hide the window when it is closeable. */
	hide(): boolean
	/** Whether the window is currently visible. */
	isOpen(): boolean
	/** Recalculate the window position against its current containment element. */
	refresh(): void
	/**
	 * Replace the containment element used for positioning.
	 * @param containment - New containment element.
	 */
	setContainment(containment?: HTMLElement): void
	/**
	 * Set the anchor position while preserving the current on-screen location where possible.
	 * @param position - New anchor position.
	 */
	setPosition(position: GooFloatingWindowPosition): void
	/** Show the window. */
	show(): void
	/** Toggle the window visibility. */
	toggle(): void
}

/** Runtime helpers for global floating-window behaviors. */
export interface GooFloatingWindowRuntime {
	/** Hide the topmost focused closeable floating window. */
	hideFocused(): boolean
}
