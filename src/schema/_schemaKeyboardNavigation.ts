const SCHEMA_FOCUSABLE_SELECTOR = [
	'button:not([disabled])',
	'[href]',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',')

export function attachSchemaKeyboardNavigation(element: HTMLElement): void {
	element.tabIndex = 0
	element.setAttribute('tabindex', '0')
	element.setAttribute('role', 'group')
	if (!element.hasAttribute('aria-label')) {
		element.setAttribute('aria-label', 'Settings')
	}

	element.addEventListener('keydown', event => {
		if (!isSchemaNavigationKey(event.key) || !shouldHandleSchemaNavigation(event, element)) {
			return
		}

		const focusable = getSchemaFocusableElements(element)
		if (!focusable.length) {
			return
		}

		const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
		const currentIndex = active ? focusable.indexOf(active) : -1
		const target = getSchemaNavigationTarget(focusable, currentIndex, event.key)
		if (!target) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		target.focus({ preventScroll: true })
	})
}

function isSchemaNavigationKey(key: string): boolean {
	return key === 'ArrowDown'
		|| key === 'ArrowRight'
		|| key === 'ArrowUp'
		|| key === 'ArrowLeft'
		|| key === 'Home'
		|| key === 'End'
}

function shouldHandleSchemaNavigation(event: KeyboardEvent, element: HTMLElement): boolean {
	const target = event.target
	if (!(target instanceof HTMLElement) || !element.contains(target)) {
		return false
	}

	if (target === element) {
		return true
	}

	if (isNativeKeyboardOwner(target)) {
		return false
	}

	return target.classList.contains('goo-folder__header')
		|| target.classList.contains('goo-schema__reset')
}

function isNativeKeyboardOwner(element: HTMLElement): boolean {
	if (element.isContentEditable) {
		return true
	}

	const tagName = element.tagName.toLowerCase()
	if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
		return true
	}

	const role = element.getAttribute('role')
	return role === 'combobox'
		|| role === 'listbox'
		|| role === 'slider'
		|| role === 'spinbutton'
		|| role === 'textbox'
}

function getSchemaFocusableElements(element: HTMLElement): HTMLElement[] {
	return [ ...element.querySelectorAll<HTMLElement>(SCHEMA_FOCUSABLE_SELECTOR) ]
		.filter(candidate => candidate !== element && isSchemaFocusableElement(candidate))
}

function isSchemaFocusableElement(element: HTMLElement): boolean {
	if (element.hidden || element.getAttribute('aria-disabled') === 'true') {
		return false
	}

	const style = window.getComputedStyle(element)
	return style.display !== 'none'
		&& style.visibility !== 'hidden'
}

function getSchemaNavigationTarget(
	focusable: HTMLElement[],
	currentIndex: number,
	key: string
): HTMLElement | undefined {
	if (key === 'Home') {
		return focusable[0]
	}
	if (key === 'End') {
		return focusable[focusable.length - 1]
	}

	const direction = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1
	if (currentIndex < 0) {
		return direction > 0 ? focusable[0] : focusable[focusable.length - 1]
	}

	return focusable[(currentIndex + direction + focusable.length) % focusable.length]
}
