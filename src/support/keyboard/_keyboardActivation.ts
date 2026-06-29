import { isKeyboardActivationKey as isSharedKeyboardActivationKey } from '@goobits/keyboard/combo'
import {
	containKeyboardEvent as containSharedKeyboardEvent,
	handleKeyboardActivationKey
} from '@goobits/keyboard/dom'

export function isKeyboardActivationKey(key: string): boolean {
	return isSharedKeyboardActivationKey(key)
}

export function containKeyboardEvent(
	event: KeyboardEvent,
	{ preventDefault = true }: { preventDefault?: boolean } = {}
): void {
	containSharedKeyboardEvent(event, { preventDefault })
}

export function handleKeyboardActivation(
	event: KeyboardEvent,
	onActivate: () => void
): boolean {
	return handleKeyboardActivationKey(event, onActivate)
}
