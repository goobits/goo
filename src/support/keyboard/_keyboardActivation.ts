import { isKeyboardActivationKey as isSharedKeyboardActivationKey } from '@goobits/keyboard/combo'

export function isKeyboardActivationKey(key: string): boolean {
	return isSharedKeyboardActivationKey(key)
}

export function containKeyboardEvent(
	event: KeyboardEvent,
	{ preventDefault = true }: { preventDefault?: boolean } = {}
): void {
	if (preventDefault) {
		event.preventDefault()
	}
	event.stopImmediatePropagation()
}

export function handleKeyboardActivation(
	event: KeyboardEvent,
	onActivate: () => void
): boolean {
	if (!isKeyboardActivationKey(event.key)) {
		return false
	}

	containKeyboardEvent(event)
	onActivate()
	return true
}
