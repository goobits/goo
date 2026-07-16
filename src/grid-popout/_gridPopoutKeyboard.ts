import {
	containKeyboardEvent,
	isKeyboardActivationKey
} from '../support/keyboard/_keyboardActivation.ts'

export type GridPopoutTriggerKeyboardOptions = {
	close: () => void
	isOpen: () => boolean
	open: () => void
}

export type GridPopoutDocumentKeyboardOptions = {
	close: () => void
	focusTrigger: () => void
	isOpen: () => boolean
}

export type GridPopoutListKeyboardOptions = {
	choose: (id: string) => void
	close: () => void
	focusSibling: (option: HTMLElement | null, delta: number) => void
	focusTrigger: () => void
}

export function handleGridPopoutTriggerKeyboardEvent(
	event: KeyboardEvent,
	{ close, isOpen, open }: GridPopoutTriggerKeyboardOptions
): boolean {
	if (event.key === 'Escape') {
		if (!isOpen()) return false
		containKeyboardEvent(event)
		close()
		return true
	}

	if (event.key === 'Tab') {
		if (!isOpen()) return false
		containKeyboardEvent(event, { preventDefault: false })
		close()
		return true
	}

	if (!isKeyboardActivationKey(event.key) && event.key !== 'ArrowDown') {
		return false
	}

	containKeyboardEvent(event)
	open()
	return true
}

export function handleGridPopoutDocumentKeyboardEvent(
	event: KeyboardEvent,
	{ close, focusTrigger, isOpen }: GridPopoutDocumentKeyboardOptions
): boolean {
	if (!isOpen() || event.key !== 'Escape') {
		return false
	}

	containKeyboardEvent(event)
	close()
	focusTrigger()
	return true
}

export function handleGridPopoutListKeyboardEvent(
	event: KeyboardEvent,
	{
		choose,
		close,
		focusSibling,
		focusTrigger
	}: GridPopoutListKeyboardOptions
): boolean {
	const option = event.target instanceof Element
		? event.target.closest<HTMLElement>('.goo-grid-picker__item')
		: null

	switch (event.key) {
		case 'Escape':
			containKeyboardEvent(event)
			close()
			focusTrigger()
			return true

		case 'Tab':
			containKeyboardEvent(event, { preventDefault: false })
			close()
			focusTrigger()
			return true

		case 'ArrowDown':
		case 'ArrowRight':
		case 'ArrowUp':
		case 'ArrowLeft':
			containKeyboardEvent(event)
			focusSibling(option, getGridPopoutKeyboardDelta(event.key))
			return true
	}

	if (isKeyboardActivationKey(event.key)) {
		if (!option?.dataset.optionId) return false
		containKeyboardEvent(event)
		choose(option.dataset.optionId)
		return true
	}

	return false
}

export function getGridPopoutKeyboardDelta(key: string): number {
	if (key === 'ArrowUp') return -1
	if (key === 'ArrowDown') return 1
	const rtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
	return key === 'ArrowLeft'
		? rtl ? 1 : -1
		: rtl ? -1 : 1
}
