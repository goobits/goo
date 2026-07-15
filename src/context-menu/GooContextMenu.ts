/**
 * @fileoverview createGooContextMenu - Right-click context menu
 * Thin wrapper around GooSelect for context menu use cases.
 * @module goo/context-menu
 */

import { createSelectField } from '../select/_createSelectField.ts'
import type {
	GooSelectActionContext,
	GooSelectDropdownSemantics,
	GooSelectElement,
	GooSelectMenuOptions,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectOptionsInput
} from '../select/index.ts'
import { createLifecycleBag } from '../support/utils/lifecycleBag.ts'

const POINTER_CONTEXT_MENU_GESTURE_MS = 500
const CONTEXT_MENU_SEMANTICS: GooSelectDropdownSemantics = {
	containerRole: 'menu',
	optionRole: 'menuitem',
	popupRole: 'menu',
	usesSelectedState: false
}

/**
 * Goo context menu option.
 */
export type GooContextMenuOption = GooSelectOption

/**
 * Goo context menu options.
 */
export interface GooContextMenuOptions {
	options?: GooContextMenuOption[]
	enableKeyboard?: boolean
	showSelectionIndicator?: boolean
	menu?: GooSelectMenuOptions
	className?: string
	actionContext?: GooSelectActionContext
	id?: string
	selected?: string
	value?: string
	onopen?: () => void
	onclose?: () => void
}

/** Options accepted when opening a context menu. */
export type GooContextMenuOpenOptions = GooSelectOpenOptions & {
	x?: number
	y?: number
}

/** Native context menu element returned by `createGooContextMenu`. */
export type GooContextMenuElement = GooSelectElement & {
	/** Attach this context menu to an element's `contextmenu` event. */
	attachTo(
		element: HTMLElement,
		handler?: (event: MouseEvent) => false | { options?: GooSelectOptionsInput } | void
	): () => void
	/** Open the menu at a point or target. */
	open(options?: GooContextMenuOpenOptions): boolean
}

/**
 * Create a context menu instance.
 * This is a thin wrapper around GooSelect configured for context menu use.
 *
 * @param {GooContextMenuOptions} [options={}] - Context menu options.
 * @returns {GooSelectElement}
 *
 * @example
 * const menu = createGooContextMenu({
 *   options: [
 *     { label: 'Cut', shortcut: 'meta+x', onChoose: () => cut() },
 *     { label: 'Copy', shortcut: 'meta+c', onChoose: () => copy() },
 *     { label: 'Paste', shortcut: 'meta+v', onChoose: () => paste() },
 *     { type: 'divider' },
 *     { label: 'Delete', onChoose: () => remove() }
 *   ]
 * })
 *
 * // Open at click position
 * element.addEventListener('contextmenu', (e) => {
 *   e.preventDefault()
 *   menu.open({ at: { x: e.clientX, y: e.clientY } })
 * })
 */
export function createGooContextMenu(options: GooContextMenuOptions = {}): GooContextMenuElement {
	const {
		options: menuOptions = [],
		enableKeyboard = true,
		showSelectionIndicator = false,
		menu = {},
		className = '',
		actionContext,
		id,
		selected,
		value,
		onopen,
		onclose
	} = options

	let contextMenuOpened = false
	let contextMenuAnchor: HTMLElement | null = null
	let delegatesPointerCloseToPopout = false
	let releasePageUnfocus: (() => void) | null = null

	// Create GooSelect with context menu defaults
	const select = createSelectField({
		options: menuOptions,
		enableKeyboard,
		showSelectionIndicator,
		showHeader: false,      // No trigger button
		id,
		value: value ?? selected,
		menu: {
			arrow: true,
			backdrop: false,
			/* Menus size to their items, not to the (often tiny icon-button)
			   trigger: trigger-width sizing writes an inline width on the list,
			   leaving rows narrower than the menu's width floor. */
			width: 'content',
			...menu,
			popoutClassName: [ 'goo-context-menu-popout', className, menu.popoutClassName ].filter(Boolean).join(' '),
			semantics: menu.semantics ?? CONTEXT_MENU_SEMANTICS
		},
		className: `goo-context-menu ${ className }`.trim(),
		actionContext,
		onopen: () => {
			contextMenuOpened = true
			bindPageUnfocus()
			onopen?.()
		},
		onclose: () => {
			contextMenuOpened = false
			unbindPageUnfocus()
			onclose?.()
		}
	})
	// Context menus render their visible panel in a separate popout. Their
	// controller host must not add an empty line box when an owner appends it
	// to the document body.
	select.hidden = true

	// Override open to accept position coordinates directly
	const contextMenu = select as GooContextMenuElement
	const originalOpen = contextMenu.open.bind(contextMenu)
	const originalClose = contextMenu.close.bind(contextMenu)
	const originalDestroy = contextMenu.destroy.bind(contextMenu)
	const attachments = createLifecycleBag()
	contextMenu.open = function openContextMenu(opts: GooContextMenuOpenOptions = {}) {
		const { x, y, at, ...restOpts } = opts

		// Accept x/y directly or via at object
		let positionAt = at
		if (x !== undefined || y !== undefined) {
			positionAt = { x: x ?? 0, y: y ?? 0 }
		}
		const anchorElement = positionAt instanceof HTMLElement ? positionAt : null

		if (contextMenuOpened || contextMenu.isOpen()) {
			// Opening again from the same element anchor toggles the menu
			// closed, like a native menu button; trigger owners get this
			// without wiring their own toggle.
			if (anchorElement && anchorElement === contextMenuAnchor) {
				contextMenu.close()
				return false
			}
			contextMenuAnchor = anchorElement
			const pointDefaults = getPointOpenDefaults(positionAt, restOpts)
			return contextMenu.updatePosition({
				...restOpts,
				...pointDefaults,
				at: positionAt
			})
		}

		contextMenuAnchor = anchorElement
		const pointDefaults = getPointOpenDefaults(positionAt, restOpts)
		const openOpts = {
			...restOpts,
			...pointDefaults
		}

		const shouldFocusPanel = opts.autoFocus === true
		const clickToClose = openOpts.clickToClose ?? getAnchorAwareClickToClose(anchorElement)
		delegatesPointerCloseToPopout = typeof clickToClose === 'function'
		const didOpen = originalOpen({
			...openOpts,
			at: positionAt,
			autoFocus: shouldFocusPanel,
			clickToClose,
			initialFocus: shouldFocusPanel ? 'none' : openOpts.initialFocus
		})
		if (didOpen) {
			contextMenuOpened = true
			bindPageUnfocus()
			if (shouldFocusPanel) focusOpenContextMenuPanelWhenVisible()
		}
		return didOpen
	}
	contextMenu.close = function closeContextMenu(opts = {}) {
		contextMenuOpened = false
		contextMenuAnchor = null
		delegatesPointerCloseToPopout = false
		unbindPageUnfocus()
		originalClose(opts)
	}

	// Add convenience method for right-click handling
	contextMenu.attachTo = function attachTo($element, handler) {
		let closeOnlyContextMenuGesture = false
		let closeOnlyContextMenuReset: ReturnType<typeof setTimeout> | null = null
		let pointerContextMenuGesture = false
		let pointerContextMenuReset: ReturnType<typeof setTimeout> | null = null
		const clearPointerContextMenuGesture = () => {
			pointerContextMenuGesture = false
			if (pointerContextMenuReset) {
				clearTimeout(pointerContextMenuReset)
				pointerContextMenuReset = null
			}
		}
		const markPointerContextMenuGesture = () => {
			pointerContextMenuGesture = true
			if (pointerContextMenuReset) clearTimeout(pointerContextMenuReset)
			pointerContextMenuReset = setTimeout(clearPointerContextMenuGesture, POINTER_CONTEXT_MENU_GESTURE_MS)
		}
		const clearCloseOnlyContextMenuGesture = () => {
			closeOnlyContextMenuGesture = false
			if (closeOnlyContextMenuReset) {
				clearTimeout(closeOnlyContextMenuReset)
				closeOnlyContextMenuReset = null
			}
		}
		const pointerHandler = (e: PointerEvent) => {
			if (e.button !== 2 || !isEventInsideElement(e, $element)) return
			markPointerContextMenuGesture()
			if (!(contextMenuOpened || contextMenu.isOpen())) return

			closeOnlyContextMenuGesture = true
			if (closeOnlyContextMenuReset) clearTimeout(closeOnlyContextMenuReset)
			closeOnlyContextMenuReset = setTimeout(clearCloseOnlyContextMenuGesture, POINTER_CONTEXT_MENU_GESTURE_MS)
			contextMenu.close()
		}
		const contextHandler = (e: MouseEvent) => {
			e.preventDefault()
			e.stopPropagation()
			focusContextMenuOwner($element)
			const openedFromPointer = pointerContextMenuGesture
			clearPointerContextMenuGesture()

			if (closeOnlyContextMenuGesture) {
				clearCloseOnlyContextMenuGesture()
				return
			}

			if (contextMenuOpened || contextMenu.isOpen()) {
				contextMenu.close()
				return
			}

			// Allow handler to modify options or cancel
			if (handler) {
				const result = handler(e)
				if (result === false) return
				if (result && typeof result === 'object' && 'options' in result && result.options) {
					contextMenu.setOptions(result.options)
				}
			}

			const didOpen = openedFromPointer
				? contextMenu.open({ x: e.clientX, y: e.clientY, initialFocus: 'none' })
				: contextMenu.open({ at: $element, autoFocus: true, initialFocus: 'none' })
			if (didOpen && !openedFromPointer) {
				focusOpenContextMenuPanel()
			}
		}

		document.addEventListener('pointerdown', pointerHandler as EventListener, true)
		$element.addEventListener('contextmenu', contextHandler as EventListener)
		return attachments.add(() => {
			clearPointerContextMenuGesture()
			clearCloseOnlyContextMenuGesture()
			document.removeEventListener('pointerdown', pointerHandler as EventListener, true)
			$element.removeEventListener('contextmenu', contextHandler as EventListener)
		})
	}

	contextMenu.destroy = function destroyContextMenu() {
		attachments.destroy()
		unbindPageUnfocus()
		contextMenuOpened = false
		originalDestroy()
	}

	return contextMenu

	function bindPageUnfocus(): void {
		if (releasePageUnfocus) return

		const closeForPageUnfocus = () => {
			if (contextMenuOpened || contextMenu.isOpen()) {
				contextMenu.close()
			}
		}
		const closeForVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				closeForPageUnfocus()
			}
		}
		const closeForOutsidePointer = (event: PointerEvent) => {
			if (delegatesPointerCloseToPopout) return
			const target = event.target
			if (target instanceof Element && target.closest('.goo-popout')) return
			if (contextMenuAnchor && isEventOnElement(event, contextMenuAnchor)) return
			closeForPageUnfocus()
		}
		// Point opens sit flush under the cursor, so a repeat right-click lands on
		// the open menu itself; native menus swallow that instead of showing the
		// browser context menu.
		const suppressMenuContextMenu = (event: MouseEvent) => {
			const target = event.target
			if (target instanceof Element && target.closest('.goo-popout')) {
				event.preventDefault()
				event.stopPropagation()
			}
		}

		window.addEventListener('blur', closeForPageUnfocus)
		window.addEventListener('pagehide', closeForPageUnfocus)
		document.addEventListener('pointerdown', closeForOutsidePointer, true)
		document.addEventListener('contextmenu', suppressMenuContextMenu, true)
		document.addEventListener('visibilitychange', closeForVisibilityChange)
		releasePageUnfocus = () => {
			window.removeEventListener('blur', closeForPageUnfocus)
			window.removeEventListener('pagehide', closeForPageUnfocus)
			document.removeEventListener('pointerdown', closeForOutsidePointer, true)
			document.removeEventListener('contextmenu', suppressMenuContextMenu, true)
			document.removeEventListener('visibilitychange', closeForVisibilityChange)
			releasePageUnfocus = null
		}
	}

	function unbindPageUnfocus(): void {
		releasePageUnfocus?.()
	}
}

function isEventInsideElement(event: Event, element: HTMLElement): boolean {
	const target = event.target
	return target instanceof Node && element.contains(target)
}

function focusContextMenuOwner(element: HTMLElement): void {
	if (element.contains(document.activeElement)) return
	element.focus({ preventScroll: true })
}

function focusOpenContextMenuPanel(): void {
	const panels = document.querySelectorAll<HTMLElement>('.goo-context-menu-popout .goo-select__options')
	panels.item(panels.length - 1)?.focus({ preventScroll: true })
}

function focusOpenContextMenuPanelWhenVisible(attempts = 30): void {
	const panel = getLatestOpenContextMenuPanel()
	if (panel && getComputedStyle(panel).visibility !== 'hidden') {
		panel.focus({ preventScroll: true })
		return
	}

	if (attempts <= 0) {
		focusOpenContextMenuPanel()
		return
	}

	requestAnimationFrame(() => focusOpenContextMenuPanelWhenVisible(attempts - 1))
}

function getLatestOpenContextMenuPanel(): HTMLElement | null {
	const panels = document.querySelectorAll<HTMLElement>('.goo-context-menu-popout .goo-select__options')
	return panels.item(panels.length - 1) ?? null
}

function getAnchorAwareClickToClose(anchor: HTMLElement | null): GooContextMenuOpenOptions['clickToClose'] | undefined {
	if (!anchor) return undefined

	return (event, isInsidePopout) => {
		if (isInsidePopout) return false
		if (event.originalEvent && isEventOnElement(event.originalEvent, anchor)) return false
		return true
	}
}

function isEventOnElement(event: Event, element: HTMLElement): boolean {
	if (event.composedPath().includes(element)) return true
	const target = event.target
	return target instanceof Node && element.contains(target)
}

/* Point opens (right-click) place the menu flush at the pointer like native
   context menus: top-left corner on the cursor, no anchor arrow. Element
   anchors keep the configured arrow. */
function getPointOpenDefaults(
	positionAt: GooContextMenuOpenOptions['at'],
	opts: Omit<GooContextMenuOpenOptions, 'at' | 'x' | 'y'>
): Pick<GooContextMenuOpenOptions, 'align' | 'offset' | 'showArrow'> {
	if (!isPointAnchor(positionAt)) return {}
	return {
		align: opts.align ?? positionAt.align ?? 'left top to right top',
		offset: opts.offset ?? positionAt.offset ?? { x: 0, y: 0 },
		showArrow: opts.showArrow ?? false
	}
}

function isPointAnchor(positionAt: GooContextMenuOpenOptions['at']): positionAt is Exclude<GooContextMenuOpenOptions['at'], HTMLElement | undefined> {
	if (!positionAt || positionAt instanceof HTMLElement) return false
	if (positionAt.element) return false
	return Boolean(positionAt.point || positionAt.x !== undefined || positionAt.y !== undefined)
}
