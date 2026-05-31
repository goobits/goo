/**
 * @fileoverview DOM helpers for GooSelect.
 * @module goobits/select/selectDom
 */

// Platform detection for shortcut display
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

/**
 * Evaluate a value that might be a function.
 * @param val - Value or function
 * @param ctx - Context for function call
 * @returns The evaluated value
 */
export function evaluate<T>(val: T | (() => T), ctx?: unknown): T {
	return typeof val === 'function' ? (val as () => T).call(ctx) : val
}

/**
 * Format keyboard shortcut key for display.
 * Converts keys to platform-specific symbols (⌘, ⌥, etc. on Mac).
 * @param key - Key to format
 * @returns Formatted key string
 */
export function formatKey(key: string): string {
	const k = key.trim().toLowerCase()
	if (IS_MAC) {
		if (k === 'meta' || k === 'cmd' || k === 'command') return '⌘'
		if (k === 'alt' || k === 'option') return '⌥'
		if (k === 'shift') return '⇧'
		if (k === 'ctrl' || k === 'control') return '⌃'
		if (k === 'delete' || k === 'backspace') return '⌫'
	} else {
		if (k === 'meta' || k === 'cmd' || k === 'command') return 'Ctrl'
		if (k === 'alt' || k === 'option') return 'Alt'
		if (k === 'shift') return 'Shift'
		if (k === 'ctrl' || k === 'control') return 'Ctrl'
	}
	return key.trim()
}

/**
 * Create shortcut element with individual key boxes.
 * @param shortcut - Shortcut string (e.g., "Cmd+S") or array of keys
 * @returns HTMLElement or null if no shortcut provided
 */
export function createShortcut(shortcut: string | string[] | null | undefined): HTMLElement | null {
	if (!shortcut) return null

	const keys = Array.isArray(shortcut) ? shortcut : shortcut.split('+')

	const $shortcut = document.createElement('span')
	$shortcut.className = 'goo-select__shortcut'

	for (const key of keys) {
		const $key = document.createElement('span')
		$key.className = 'goo-select__shortcut-key'
		$key.textContent = formatKey(key)
		$shortcut.appendChild($key)
	}

	return $shortcut
}

/**
 * Create icon element from various formats.
 * Supports: HTMLElement, URL/data URI, inline HTML (SVG), CSS class names.
 * @param icon - Icon specification
 * @returns HTMLElement or null if no icon provided
 */
export function createIcon(
	icon: string | HTMLElement | (() => string | HTMLElement) | null | undefined
): HTMLElement | null {
	if (!icon) return null

	const evaluatedIcon = evaluate(icon)

	// DOM node - wrap in icon container and clone
	if (evaluatedIcon instanceof HTMLElement) {
		const $icon = document.createElement('span')
		$icon.className = 'goo-select__icon'
		$icon.appendChild(evaluatedIcon.cloneNode(true))
		return $icon
	}

	// String-based icon
	if (typeof evaluatedIcon === 'string') {
		const $icon = document.createElement('span')
		$icon.className = 'goo-select__icon'

		// URL or data URI
		if (
			evaluatedIcon.startsWith('http') ||
      evaluatedIcon.startsWith('./') ||
      evaluatedIcon.startsWith('/') ||
      evaluatedIcon.startsWith('data:')
		) {
			const $img = document.createElement('img')
			$img.src = evaluatedIcon
			$img.alt = ''
			$icon.appendChild($img)
			return $icon
		}

		// Inline HTML (starts with <)
		if (evaluatedIcon.startsWith('<')) {
			$icon.innerHTML = evaluatedIcon
			return $icon
		}

		// CSS class
		$icon.classList.add(...evaluatedIcon.split(' ').filter(Boolean))
		return $icon
	}

	return null
}
