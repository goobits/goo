import { getFocusTrapItems } from './_focus.ts'
import { containKeyboardEvent } from './_keyboardActivation.ts'

export interface LinearNavigationOptions {
	activate?: (item: HTMLElement) => void
	activeItem?: HTMLElement | null
	itemSelector?: string
	orientation?: 'horizontal' | 'vertical'
	wrap?: boolean
}

export interface MenuKeyboardOptions {
	close?: () => void
}

export function handleLinearNavigationKeyboardEvent(
	event: KeyboardEvent,
	root: HTMLElement,
	options: LinearNavigationOptions = {}
): boolean {
	const items = getCompositeItems(root, options.itemSelector)
	if (items.length === 0) return false

	const keyMap = getLinearNavigationKeyMap(options.orientation ?? 'horizontal')
	const direction = keyMap[event.key]
	if (direction === undefined) return false

	containKeyboardEvent(event)

	const activeItem = resolveActiveItem(root, items, options.activeItem)
	const activeIndex = activeItem ? items.indexOf(activeItem) : -1
	const nextIndex = resolveNextIndex(activeIndex, items.length, direction, options.wrap ?? true)
	const nextItem = items[nextIndex]
	if (!nextItem) return true

	nextItem.focus({ preventScroll: true })
	options.activate?.(nextItem)
	return true
}

export function focusFirstMenuItem(root: HTMLElement): boolean {
	const first = getMenuItems(root)[0]
	if (!first) return false
	first.focus({ preventScroll: true })
	return true
}

export function handleMenuKeyboardEvent(
	event: KeyboardEvent,
	root: HTMLElement,
	options: MenuKeyboardOptions = {}
): boolean {
	if (event.key === 'Escape') {
		containKeyboardEvent(event)
		options.close?.()
		return true
	}

	const items = getMenuItems(root)
	if (items.length === 0) return false

	const activeItem = resolveActiveItem(root, items)
	const activeIndex = activeItem ? items.indexOf(activeItem) : -1

	if (event.key === 'ArrowDown') {
		containKeyboardEvent(event)
		items[resolveNextIndex(activeIndex, items.length, 1, true)]?.focus({ preventScroll: true })
		return true
	}
	if (event.key === 'ArrowUp') {
		containKeyboardEvent(event)
		items[resolveNextIndex(activeIndex, items.length, -1, true)]?.focus({ preventScroll: true })
		return true
	}
	if (event.key === 'Home') {
		containKeyboardEvent(event)
		items[0]?.focus({ preventScroll: true })
		return true
	}
	if (event.key === 'End') {
		containKeyboardEvent(event)
		items[items.length - 1]?.focus({ preventScroll: true })
		return true
	}

	return false
}

function getCompositeItems(root: HTMLElement, itemSelector?: string): HTMLElement[] {
	const selected = itemSelector
		? Array.from(root.querySelectorAll<HTMLElement>(itemSelector))
		: getFocusTrapItems(root)

	return selected.filter(element => {
		if (!root.contains(element)) return false
		if (element.closest('[inert]')) return false
		if (element.getAttribute('aria-disabled') === 'true') return false
		if (element instanceof HTMLButtonElement && element.disabled) return false
		return element.tabIndex >= 0 || element.matches('[role="tab"],[role="menuitem"],button')
	})
}

function getMenuItems(root: HTMLElement): HTMLElement[] {
	return getCompositeItems(root, [
		'[role="menuitem"]',
		'[role="menuitemcheckbox"]',
		'[role="menuitemradio"]',
		'button:not([disabled])',
		'a[href]',
		'[tabindex]:not([tabindex="-1"])'
	].join(','))
}

function getLinearNavigationKeyMap(
	orientation: 'horizontal' | 'vertical'
): Record<string, number | undefined> {
	if (orientation === 'vertical') {
		return {
			ArrowDown: 1,
			ArrowUp: -1,
			End: Number.POSITIVE_INFINITY,
			Home: Number.NEGATIVE_INFINITY
		}
	}
	return {
		ArrowLeft: -1,
		ArrowRight: 1,
		End: Number.POSITIVE_INFINITY,
		Home: Number.NEGATIVE_INFINITY
	}
}

function resolveActiveItem(
	root: HTMLElement,
	items: HTMLElement[],
	activeItem?: HTMLElement | null
): HTMLElement | null {
	if (activeItem && items.includes(activeItem)) return activeItem

	const activeElement = root.ownerDocument.activeElement
	return activeElement instanceof HTMLElement && items.includes(activeElement)
		? activeElement
		: null
}

function resolveNextIndex(
	activeIndex: number,
	itemCount: number,
	direction: number,
	wrap: boolean
): number {
	if (direction === Number.POSITIVE_INFINITY) return itemCount - 1
	if (direction === Number.NEGATIVE_INFINITY) return 0
	const next = activeIndex + direction
	if (wrap) return (next + itemCount) % itemCount
	return Math.max(0, Math.min(itemCount - 1, next))
}
