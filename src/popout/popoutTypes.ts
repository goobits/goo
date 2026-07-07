import type {
	PositionAvoidRect,
	PositionResult
} from '../support/positioning/index.ts'

/** Runtime controls for the shared Goo popout registry. */
export interface GooPopoutManager {
	/** Close all active popouts. */
	closeAll(): void
	/** Close active popouts that do not contain the provided element. */
	closeOutside(target: HTMLElement): void
	/** Return the most recently opened popout. */
	getActive(): GooPopoutInstance | null
}

/** Containment configuration for a Goo popout. */
export interface PopoutKeepWithin {
	element?: HTMLElement
	margin?: number
	fullScreen?: boolean
}

/** Target specification: element or coordinates with optional alignment and offsets. */
export interface GooPopoutAt {
	element?: HTMLElement
	point?: { x?: number; y?: number }
	x?: number
	y?: number
	align?: string
	offset?: { x?: number; y?: number }
	avoidRects?: PositionAvoidRect[]
	avoidMargin?: number
}

/** Options for creating a Goo popout instance. */
export interface GooPopoutOptions {
	content?: Element | Element[]
	parentElement?: HTMLElement
	ariaLabel?: string
	ariaLabelledby?: string
	ariaDescribedby?: string

	/**
	 * ARIA role for the popout container. Defaults to `'dialog'`.
	 * Pass `null` when the content provides its own role.
	 */
	role?: string | null
	at?: HTMLElement | GooPopoutAt
	align?: string
	offset?: { x?: number; y?: number }
	keepWithin?: PopoutKeepWithin
	className?: string
	dataset?: Record<string, string>
	attributes?: Record<string, string | number | boolean | null | undefined>
	showArrow?: boolean
	showBackdrop?: boolean
	clickToClose?: boolean | ((event: GooPopoutPointerEvent, isInsidePopout: boolean) => boolean)
	escapeToClose?: boolean
	dragToMove?: boolean
	openImmediately?: boolean
	rtl?: boolean

	/**
	 * Controls initial focus behavior when popout opens.
	 * - 'content': Focus first focusable element in content.
	 * - 'popout': Focus the popout container itself.
	 * - 'none': Leave focus where it is.
	 */
	initialFocus?: 'content' | 'popout' | 'none'

	/** Expand the popout to fill the viewport. */
	fullScreen?: boolean

	/** Drop built-in chrome so the content can supply its own frame. */
	chromeless?: boolean
	onOpen?: (data: { element: HTMLElement; instance: GooPopoutInstance }) => void
	onClose?: (data: { element: HTMLElement; instance: GooPopoutInstance }) => void

	/** Called after each non-fullscreen placement calculation is applied. */
	onPosition?: (data: {
		element: HTMLElement
		instance: GooPopoutInstance
		position: PositionResult
	}) => void
	onDestroy?: () => void
}

/** Pointer event data passed to Goo popout callbacks. */
export interface GooPopoutPointerEvent {
	readonly originalEvent: PointerEvent
	readonly target: EventTarget | null
	readonly clientX: number
	readonly clientY: number
	readonly isTouch: boolean
	preventDefault: () => void
	stopPropagation: () => void
}

/** GooPopout instance object returned from the factory function. */
export interface GooPopoutInstance {
	readonly element: HTMLElement | null
	readonly contentElement: HTMLElement | null
	readonly arrowElement: HTMLElement | null

	/** Most recently applied non-fullscreen position, if the popout has been placed. */
	readonly position: PositionResult | null
	isOpen: () => boolean
	open: () => Promise<void>
	close: () => Promise<void>
	toggle: () => void
	destroy: () => Promise<void>
	reposition: () => void

	/**
	 * Update the target position and reposition the popout.
	 * @param newAt - New target element or GooPopoutAt configuration.
	 * @param newAlign - Optional new alignment string.
	 */
	updatePosition: (newAt: GooPopoutAt | HTMLElement, newAlign?: string) => void
}
