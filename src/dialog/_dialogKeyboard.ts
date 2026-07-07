import { containKeyboardEvent } from '../support/keyboard/_keyboardActivation.ts'

export type DialogKeyboardOptions = {
	closeOnEscape: boolean
	isTopDialog: () => boolean
	okButton: HTMLElement | null
	onCancel: () => void
	onOk: () => void
}

export function handleDialogKeyboardEvent(
	event: KeyboardEvent,
	{
		closeOnEscape,
		isTopDialog,
		okButton,
		onCancel,
		onOk
	}: DialogKeyboardOptions
): boolean {
	if (!isTopDialog()) {
		return false
	}

	if (event.key === 'Escape' && closeOnEscape) {
		containKeyboardEvent(event)
		onCancel()
		return true
	}

	if (event.key !== 'Enter') {
		return false
	}

	const activeElement = document.activeElement
	if (activeElement === okButton || !isDialogTextEntryElement(activeElement)) {
		containKeyboardEvent(event)
		onOk()
		return true
	}

	return false
}

function isDialogTextEntryElement(element: Element | null): boolean {
	if (!(element instanceof HTMLElement)) {
		return false
	}

	if (element.isContentEditable) {
		return true
	}

	const tagName = element.tagName
	return tagName === 'INPUT'
		|| tagName === 'TEXTAREA'
		|| tagName === 'SELECT'
}
