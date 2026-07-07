import { containKeyboardEvent } from './_keyboardActivation.ts'

export interface ModalIsolationHandle {
	detach(): void
}

export interface ModalIsolationOptions {
	modal: HTMLElement
	preserve?: Array<Element | null | undefined>
}

export interface FocusTrapKeyboardOptions {
	onEscape?: () => void
	root?: HTMLElement | null
}

interface IsolatedElementState {
	ariaHidden: string | null
	element: HTMLElement
	inert: boolean
}

type InertHTMLElement = HTMLElement & { inert: boolean }

const focusableSelector = [
	'a[href]',
	'area[href]',
	'button:not([disabled])',
	'details > summary:first-of-type',
	'iframe',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[contenteditable="true"]',
	'[tabindex]:not([tabindex="-1"])'
].join(',')

export function activateModalIsolation(options: ModalIsolationOptions): ModalIsolationHandle {
	const modal = options.modal
	const ownerDocument = modal.ownerDocument
	const preserved = new Set<Element>([
		modal,
		...(options.preserve?.filter((element): element is Element => element instanceof Element) ?? [])
	])
	const isolated: IsolatedElementState[] = []

	for (const element of Array.from(ownerDocument.body.children)) {
		if (!(element instanceof HTMLElement)) continue
		if (preserved.has(element)) continue
		if ([ ...preserved ].some(item => element.contains(item) || item.contains(element))) continue

		const inertElement = element as InertHTMLElement
		isolated.push({
			ariaHidden: element.getAttribute('aria-hidden'),
			element,
			inert: inertElement.inert === true || element.hasAttribute('inert')
		})
		inertElement.inert = true
		element.setAttribute('aria-hidden', 'true')
	}

	return {
		detach() {
			for (const state of isolated) {
				const inertElement = state.element as InertHTMLElement
				inertElement.inert = state.inert
				if (state.ariaHidden === null) {
					state.element.removeAttribute('aria-hidden')
				} else {
					state.element.setAttribute('aria-hidden', state.ariaHidden)
				}
			}
		}
	}
}

export function getFocusTrapItems(root?: HTMLElement | null): HTMLElement[] {
	if (!root) return []

	return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(element =>
		isFocusable(element, root)
	)
}

export function handleFocusTrapKeyboardEvent(
	event: KeyboardEvent,
	options: FocusTrapKeyboardOptions = {}
): boolean {
	if (event.key === 'Escape' && options.onEscape) {
		containKeyboardEvent(event)
		options.onEscape()
		return true
	}

	if (event.key !== 'Tab' || !options.root) return false

	const items = getFocusTrapItems(options.root)
	if (items.length === 0) {
		containKeyboardEvent(event)
		options.root.focus({ preventScroll: true })
		return true
	}

	const activeElement = options.root.ownerDocument.activeElement
	const first = items[0]
	const last = items[items.length - 1]
	if (!first || !last) return false

	if (event.shiftKey) {
		if (!(activeElement instanceof HTMLElement) || activeElement === first || !options.root.contains(activeElement)) {
			containKeyboardEvent(event)
			last.focus({ preventScroll: true })
			return true
		}
		return false
	}

	if (!(activeElement instanceof HTMLElement) || activeElement === last || !options.root.contains(activeElement)) {
		containKeyboardEvent(event)
		first.focus({ preventScroll: true })
		return true
	}

	return false
}

function isFocusable(element: HTMLElement, root: HTMLElement): boolean {
	if (element.closest('[inert]')) return false
	if (element.getAttribute('aria-hidden') === 'true') return false
	if (element.tabIndex < 0 && !element.matches('[contenteditable="true"]')) return false
	if (isDisabledFormControl(element)) return false
	return root.contains(element)
}

function isDisabledFormControl(element: HTMLElement): boolean {
	return element instanceof HTMLButtonElement
		|| element instanceof HTMLInputElement
		|| element instanceof HTMLSelectElement
		|| element instanceof HTMLTextAreaElement
		? element.disabled
		: false
}
