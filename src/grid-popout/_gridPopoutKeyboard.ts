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
		containGridPopoutKey(event)
		close()
		return true
	}

	if (event.key === 'Tab') {
		if (!isOpen()) return false
		containGridPopoutKey(event, { preventDefault: false })
		close()
		return true
	}

	if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') {
		return false
	}

	containGridPopoutKey(event)
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

	containGridPopoutKey(event)
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
		? event.target.closest<HTMLElement>('sketch-grid-item')
		: null

	switch (event.key) {
		case 'Enter':
		case ' ':
			if (!option?.dataset.optionId) return false
			containGridPopoutKey(event)
			choose(option.dataset.optionId)
			return true

		case 'Escape':
			containGridPopoutKey(event)
			close()
			focusTrigger()
			return true

		case 'Tab':
			containGridPopoutKey(event, { preventDefault: false })
			close()
			focusTrigger()
			return true

		case 'ArrowDown':
		case 'ArrowRight':
		case 'ArrowUp':
		case 'ArrowLeft':
			containGridPopoutKey(event)
			focusSibling(option, getGridPopoutKeyboardDelta(event.key))
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

function containGridPopoutKey(
	event: KeyboardEvent,
	{ preventDefault = true }: { preventDefault?: boolean } = {}
): void {
	if (preventDefault) event.preventDefault()
	event.stopImmediatePropagation()
}
