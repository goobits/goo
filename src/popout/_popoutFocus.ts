export function capturePopoutFocusTarget(initialFocus: 'content' | 'popout' | 'none'): HTMLElement | null {
	if (initialFocus === 'none') {
		return null
	}

	return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

export function restorePopoutFocus(
	removedElement: HTMLElement,
	previousActiveElement: HTMLElement | null
): HTMLElement | null {
	if (!previousActiveElement) return null
	const activeElement = document.activeElement
	if (
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement &&
		activeElement.isConnected &&
		!removedElement.contains(activeElement)
	) {
		return null
	}

	if (previousActiveElement.isConnected) {
		previousActiveElement.focus({ preventScroll: true })
	}
	return null
}
