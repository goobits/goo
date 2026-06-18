/**
 * Goo point.
 */
export interface GooPoint {
	readonly x: number
	readonly y: number
}

/**
 * Goo pointer target event.
 */
export interface GooPointerTargetEvent {
	readonly originalEvent: PointerEvent
	readonly target: HTMLElement
	readonly clientX: number
	readonly clientY: number
	readonly pointerId: number
	readonly pointerType: string
	readonly isTouch: boolean
	readonly point: GooPoint
	/**
	 * As client XY.
	 */
	asClientXY(): GooPoint
	/**
	 * Element from point.
	 *
	 * @param selector - selector.
	 */
	elementFromPoint(selector: string): Element | null
	/**
	 * Element from point.
	 *
	 * @param predicate - predicate.
	 */
	elementFromPoint(predicate: (element: Element) => boolean): Element | null
	/**
	 * Prevent default.
	 */
	preventDefault(): void
	/**
	 * Stop propagation.
	 */
	stopPropagation(): void
}

/** Pointer drag event emitted by {@link createPointerDrag}. */
export interface GooPointerDragEvent<Environment extends object = Record<string, unknown>> extends GooPointerTargetEvent {
	readonly state: 'start' | 'move' | 'end' | 'cancel'
	readonly START: boolean
	readonly DOWN: boolean
	readonly CHANGE: boolean
	readonly END: boolean
	readonly CANCEL: boolean
	readonly startClientX: number
	readonly startClientY: number
	readonly start: GooPoint
	readonly x: number
	readonly y: number
	readonly elementX: number
	readonly elementY: number
	readonly env: Environment
	/**
 * Delta.
 *
 * @param start - start.
 * @param end - end.
 */
	delta(start: GooPoint, end: GooPoint): GooPoint
	/**
	 * Has moved.
	 *
	 * @param threshold - threshold.
	 */
	hasMoved(threshold?: number): boolean
}

/** Pointer tap event emitted by {@link createPointerTap}. */
export interface GooPointerTapEvent extends GooPointerTargetEvent {}

/** Options for lightweight Goo pointer drag handling. */
export interface GooPointerDragOptions {
	ignoreTouch?: boolean
}

/** Options for lightweight Goo pointer tap handling. */
export interface GooPointerTapOptions extends GooPointerDragOptions {
	threshold?: number
}

/** Detachable handle returned by Goo pointer helpers. */
export interface GooPointerDragHandle {
	/**
 * Detach.
 */
	detach(): void
}

/**
 * Attach a pointer-drag listener without depending on an app-specific gesture stack.
 * @param target - Element that receives the pointer interaction.
 * @param onDrag - Callback for start, move, end, and cancel states.
 * @param options - Optional drag behavior flags.
 * @returns A handle that detaches all listeners.
 */
export function createPointerDrag<Environment extends object = Record<string, unknown>>(
	target: HTMLElement,
	onDrag: (event: GooPointerDragEvent<Environment>) => void | false,
	options: GooPointerDragOptions = {}
): GooPointerDragHandle {
	let activePointerId: number | null = null
	let lastPointerEvent: PointerEvent | null = null
	let startClientX = 0
	let startClientY = 0
	let env = {} as Environment
	let detached = false

	function emit(originalEvent: PointerEvent, state: GooPointerDragEvent<Environment>['state']): void | false {
		const x = originalEvent.clientX - startClientX
		const y = originalEvent.clientY - startClientY
		const rect = target.getBoundingClientRect()
		return onDrag({
			originalEvent,
			target,
			state,
			START: state === 'start',
			DOWN: state === 'start' || state === 'move',
			CHANGE: state === 'move',
			END: state === 'end' || state === 'cancel',
			CANCEL: state === 'cancel',
			clientX: originalEvent.clientX,
			clientY: originalEvent.clientY,
			startClientX,
			startClientY,
			start: { x: startClientX, y: startClientY },
			point: { x: originalEvent.clientX, y: originalEvent.clientY },
			x,
			y,
			elementX: originalEvent.clientX - rect.left,
			elementY: originalEvent.clientY - rect.top,
			pointerId: originalEvent.pointerId,
			pointerType: originalEvent.pointerType,
			isTouch: originalEvent.pointerType === 'touch',
			env,
			asClientXY: () => ({ x: originalEvent.clientX, y: originalEvent.clientY }),
			delta: (start, end) => ({ x: end.x - start.x, y: end.y - start.y }),
			elementFromPoint: selectorOrPredicate => findElementFromPoint(
				originalEvent.clientX,
				originalEvent.clientY,
				selectorOrPredicate
			),
			hasMoved: (threshold = 0) => Math.hypot(x, y) > threshold,
			preventDefault: () => originalEvent.preventDefault(),
			stopPropagation: () => originalEvent.stopPropagation()
		})
	}

	function onPointerDown(event: PointerEvent): void {
		if (detached) return
		if (activePointerId !== null) return
		if (!isPrimaryPointerStart(event)) return
		if (options.ignoreTouch && event.pointerType === 'touch') return
		activePointerId = event.pointerId
		lastPointerEvent = event
		startClientX = event.clientX
		startClientY = event.clientY
		env = {} as Environment
		if (emit(event, 'start') === false) {
			activePointerId = null
			lastPointerEvent = null
			env = {} as Environment
			return
		}
		try {
			target.setPointerCapture?.(event.pointerId)
		} catch {
			// Pointer capture can fail in detached or simulated DOMs; dragging still works on the target.
		}
	}

	function onPointerMove(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) return
		lastPointerEvent = event
		emit(event, 'move')
	}

	function finish(event: PointerEvent, state: 'end' | 'cancel'): void {
		if (event.pointerId !== activePointerId) return
		lastPointerEvent = event
		emit(event, state)
		clearActivePointer()
	}

	function clearActivePointer(): void {
		const pointerId = activePointerId
		activePointerId = null
		lastPointerEvent = null
		env = {} as Environment
		if (pointerId === null) return
		try {
			target.releasePointerCapture?.(pointerId)
		} catch {
			// Ignore capture release failures for the same reason as capture setup.
		}
	}

	function cancelActivePointer(): void {
		if (activePointerId === null) return
		if (lastPointerEvent) {
			emit(lastPointerEvent, 'cancel')
		}
		clearActivePointer()
	}

	function onPointerUp(event: PointerEvent): void {
		finish(event, 'end')
	}

	function onPointerCancel(event: PointerEvent): void {
		finish(event, 'cancel')
	}

	target.addEventListener('pointerdown', onPointerDown)
	target.addEventListener('pointermove', onPointerMove)
	target.addEventListener('pointerup', onPointerUp)
	target.addEventListener('pointercancel', onPointerCancel)

	return {
		detach() {
			if (detached) return
			detached = true
			target.removeEventListener('pointerdown', onPointerDown)
			target.removeEventListener('pointermove', onPointerMove)
			target.removeEventListener('pointerup', onPointerUp)
			target.removeEventListener('pointercancel', onPointerCancel)
			cancelActivePointer()
		}
	}
}

/**
 * Attach a pointer tap listener with a small movement threshold.
 * @param target - Element that receives the pointer interaction.
 * @param onTap - Callback fired after a completed tap.
 * @param options - Optional tap behavior flags.
 * @returns A handle that detaches all listeners.
 */
export function createPointerTap(
	target: HTMLElement,
	onTap: (event: GooPointerTapEvent) => void,
	options: GooPointerTapOptions = {}
): GooPointerDragHandle {
	let activePointerId: number | null = null
	let startClientX = 0
	let startClientY = 0
	const threshold = options.threshold ?? 8
	let detached = false

	function onPointerDown(event: PointerEvent): void {
		if (detached) return
		if (activePointerId !== null) return
		if (!isPrimaryPointerStart(event)) return
		if (options.ignoreTouch && event.pointerType === 'touch') return
		activePointerId = event.pointerId
		startClientX = event.clientX
		startClientY = event.clientY
	}

	function onPointerUp(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) return
		activePointerId = null
		if (Math.hypot(event.clientX - startClientX, event.clientY - startClientY) > threshold) return
		onTap(createPointerTargetEvent(target, event))
	}

	function onPointerCancel(event: PointerEvent): void {
		if (event.pointerId === activePointerId) activePointerId = null
	}

	target.addEventListener('pointerdown', onPointerDown)
	target.addEventListener('pointerup', onPointerUp)
	target.addEventListener('pointercancel', onPointerCancel)

	return {
		detach() {
			if (detached) return
			detached = true
			activePointerId = null
			target.removeEventListener('pointerdown', onPointerDown)
			target.removeEventListener('pointerup', onPointerUp)
			target.removeEventListener('pointercancel', onPointerCancel)
		}
	}
}

function createPointerTargetEvent(target: HTMLElement, originalEvent: PointerEvent): GooPointerTargetEvent {
	return {
		originalEvent,
		target,
		clientX: originalEvent.clientX,
		clientY: originalEvent.clientY,
		point: { x: originalEvent.clientX, y: originalEvent.clientY },
		pointerId: originalEvent.pointerId,
		pointerType: originalEvent.pointerType,
		isTouch: originalEvent.pointerType === 'touch',
		asClientXY: () => ({ x: originalEvent.clientX, y: originalEvent.clientY }),
		elementFromPoint: selectorOrPredicate => findElementFromPoint(
			originalEvent.clientX,
			originalEvent.clientY,
			selectorOrPredicate
		),
		preventDefault: () => originalEvent.preventDefault(),
		stopPropagation: () => originalEvent.stopPropagation()
	}
}

function isPrimaryPointerStart(event: PointerEvent): boolean {
	return event.button === 0
}

function findElementFromPoint(
	clientX: number,
	clientY: number,
	selectorOrPredicate: string | ((element: Element) => boolean)
): Element | null {
	const elements = document.elementsFromPoint?.(clientX, clientY) ?? []
	for (const element of elements) {
		if (typeof selectorOrPredicate === 'string') {
			const match = element.matches(selectorOrPredicate)
				? element
				: element.closest(selectorOrPredicate)
			if (match) return match
			continue
		}
		if (selectorOrPredicate(element)) return element
	}
	return null
}
