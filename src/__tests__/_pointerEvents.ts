export interface TestPointerEventOptions {
	readonly pointerId?: number
	readonly pointerType?: string
	readonly clientX?: number
	readonly clientY?: number
	readonly button?: number
	readonly buttons?: number
}

export function pointerEvent(type: string, options: TestPointerEventOptions = {}): PointerEvent {
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		button: options.button ?? 0,
		buttons: options.buttons ?? (type === 'pointerup' || type === 'pointercancel' ? 0 : 1),
		clientX: options.clientX ?? 0,
		clientY: options.clientY ?? 0
	})

	Object.defineProperties(event, {
		pointerId: { value: options.pointerId ?? 1 },
		pointerType: { value: options.pointerType ?? 'mouse' }
	})

	return event as PointerEvent
}
