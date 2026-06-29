import { isKeyboardActivationKey as isSharedKeyboardActivationKey } from '@goobits/keyboard/combo'
import {
	containKeyboardEvent as containSharedKeyboardEvent,
	handleKeyboardActivationKey,
	type KeyboardEventContainmentOptions } from '@goobits/keyboard/dom'

export function isKeyboardActivationKey(key: string): boolean {
	return isSharedKeyboardActivationKey(key)
}

export function containKeyboardEvent(
	event: KeyboardEvent,
	options?: KeyboardEventContainmentOptions
): void {
	containSharedKeyboardEvent(event, options)
}

export function handleKeyboardActivation(
	event: KeyboardEvent,
	onActivate: () => void,
	options?: KeyboardEventContainmentOptions
): boolean {
	return handleKeyboardActivationKey(event, onActivate, options)
}
