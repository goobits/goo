export type FocusTrapKeyboardOptions = {
	onEscape?: () => void
	root: HTMLElement | undefined
}

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',')

export function getFocusTrapItems(root: HTMLElement | undefined): HTMLElement[] {
	if (!root) return []
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

export function handleFocusTrapKeyboardEvent(
	event: KeyboardEvent,
	{ onEscape, root }: FocusTrapKeyboardOptions
): boolean {
	if (event.key === 'Escape') {
		event.preventDefault()
		event.stopImmediatePropagation()
		onEscape?.()
		return true
	}

	if (event.key !== 'Tab') {
		return false
	}

	const items = getFocusTrapItems(root)
	event.stopImmediatePropagation()
	if (items.length === 0) {
		event.preventDefault()
		return true
	}

	const first = items[0]
	const last = items[items.length - 1]
	const active = document.activeElement
	if (event.shiftKey && active === first) {
		event.preventDefault()
		last.focus()
		return true
	}
	if (!event.shiftKey && active === last) {
		event.preventDefault()
		first.focus()
		return true
	}

	return true
}
