const FOCUSABLE_CONTENT_SELECTOR =
	'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function capturePopoutFocusTarget(initialFocus: 'content' | 'popout' | 'none'): HTMLElement | null {
	if (initialFocus === 'none') {
		return null
	}

	return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

export function focusInitialPopoutTarget(
	element: HTMLElement,
	initialFocus: 'content' | 'popout' | 'none',
	openingActiveElement: HTMLElement | null
): void {
	if (initialFocus === 'none') return

	const activeElement = document.activeElement
	const focusChangedWhileOpening =
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement &&
		activeElement !== openingActiveElement
	if (focusChangedWhileOpening) return

	if (initialFocus === 'content') {
		const focusable = Array.from(
			element.querySelectorAll<HTMLElement>(FOCUSABLE_CONTENT_SELECTOR)
		).find(canReceiveFocus)
		if (focusable) {
			focusable.focus({ preventScroll: true })
			return
		}
	}

	element.focus({ preventScroll: true })
}

function canReceiveFocus(element: HTMLElement): boolean {
	if (element.matches(':disabled') || element.getAttribute('aria-hidden') === 'true') {
		return false
	}
	for (let current: HTMLElement | null = element; current; current = current.parentElement) {
		const style = getComputedStyle(current)
		if (style.display === 'none' || style.visibility === 'hidden') return false
	}
	return true
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
