export interface KeyboardEventContainmentOptions {
	preventDefault?: boolean
	stopImmediatePropagation?: boolean
	stopPropagation?: boolean
	immediate?: boolean
}

export function isKeyboardActivationKey(key: string): boolean {
	return key === 'Enter' || key === ' ' || key === 'Space' || key === 'Spacebar'
}

export function containKeyboardEvent(
	event: KeyboardEvent,
	options: KeyboardEventContainmentOptions = {}
): void {
	if (options.preventDefault ?? true) {
		event.preventDefault()
	}
	if (options.stopPropagation ?? true) {
		event.stopPropagation()
	}
	if (options.stopImmediatePropagation ?? options.immediate ?? true) {
		event.stopImmediatePropagation()
	}
}

export function handleKeyboardActivation(
	event: KeyboardEvent,
	onActivate: () => void,
	options?: KeyboardEventContainmentOptions
): boolean {
	if (!isKeyboardActivationKey(event.key)) return false
	containKeyboardEvent(event, options)
	onActivate()
	return true
}
