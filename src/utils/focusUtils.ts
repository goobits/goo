/**
 * @fileoverview Focus management utilities for modal components.
 * @module goobits/utils/focusUtils
 */

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Selector for focusable elements within a container.
 */
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Get all focusable elements within a container.
 * Excludes disabled elements and optionally elements matching an exclude selector.
 * @param container - Container element to search within
 * @param excludeSelector - Optional selector for elements to exclude
 * @returns Array of focusable elements
 */
export function getFocusableElements(
	container: HTMLElement,
	excludeSelector?: string
): HTMLElement[] {
	const selector = excludeSelector
		? `${ FOCUSABLE_SELECTOR }:not(${ excludeSelector })`
		: FOCUSABLE_SELECTOR

	return Array.from(container.querySelectorAll<HTMLElement>(selector))
		.filter(el => !(el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled)
}

/**
 * Focus the first focusable element within a container.
 * @param container - Container element
 * @param excludeSelector - Optional selector for elements to exclude
 * @returns Whether an element was focused
 */
export function focusFirst(container: HTMLElement, excludeSelector?: string): boolean {
	const focusable = getFocusableElements(container, excludeSelector)
	if (focusable.length > 0) {
		focusable[0].focus()
		return true
	}
	return false
}

/**
 * Focus the last focusable element within a container.
 * @param container - Container element
 * @param excludeSelector - Optional selector for elements to exclude
 * @returns Whether an element was focused
 */
export function focusLast(container: HTMLElement, excludeSelector?: string): boolean {
	const focusable = getFocusableElements(container, excludeSelector)
	if (focusable.length > 0) {
		focusable[focusable.length - 1].focus()
		return true
	}
	return false
}

/**
 * Create focus trap sentinels for a container.
 * Returns start and end elements that should wrap the container content.
 * @param onFocusStart - Callback when start sentinel receives focus (should focus last element)
 * @param onFocusEnd - Callback when end sentinel receives focus (should focus first element)
 * @returns Object with $start and $end sentinel elements
 */
export function createFocusTrapSentinels(
	onFocusStart: () => void,
	onFocusEnd: () => void
): { $start: HTMLElement; $end: HTMLElement } {
	const $start = document.createElement('div')
	$start.className = 'goo-focus-trap'
	$start.tabIndex = 0
	$start.addEventListener('focus', onFocusStart)

	const $end = document.createElement('div')
	$end.className = 'goo-focus-trap'
	$end.tabIndex = 0
	$end.addEventListener('focus', onFocusEnd)

	return { $start, $end }
}
