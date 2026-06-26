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

const DEFAULT_CURSOR_GAP_X = 16
const DEFAULT_CURSOR_ARROW_TIP_OFFSET_Y = 17
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
			popoutClassName: [ 'goo-context-menu-popout', className ].filter(Boolean).join(' '),
			...menu,
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
		positionAt = getPointOpenAnchor(positionAt, restOpts)
		const pointDefaults = getPointOpenDefaults(positionAt, restOpts)
		const openOpts = {
			...restOpts,
			...pointDefaults
		}

		if (contextMenuOpened || contextMenu.isOpen()) {
			return contextMenu.updatePosition({
				...openOpts,
				at: positionAt
			})
		}

		const didOpen = originalOpen({
			...openOpts,
			at: positionAt,
			autoFocus: opts.autoFocus === true
		})
		if (didOpen) {
			contextMenuOpened = true
			bindPageUnfocus()
		}
		return didOpen
	}
	contextMenu.close = function closeContextMenu(opts = {}) {
		contextMenuOpened = false
		unbindPageUnfocus()
		originalClose(opts)
	}

	// Add convenience method for right-click handling
	contextMenu.attachTo = function attachTo($element, handler) {
		let closeOnlyContextMenuGesture = false
		let closeOnlyContextMenuReset: ReturnType<typeof setTimeout> | null = null
		const clearCloseOnlyContextMenuGesture = () => {
			closeOnlyContextMenuGesture = false
			if (closeOnlyContextMenuReset) {
				clearTimeout(closeOnlyContextMenuReset)
				closeOnlyContextMenuReset = null
			}
		}
		const pointerHandler = (e: PointerEvent) => {
			if (e.button !== 2 || !isEventInsideElement(e, $element)) return
			if (!(contextMenuOpened || contextMenu.isOpen())) return

			closeOnlyContextMenuGesture = true
			if (closeOnlyContextMenuReset) clearTimeout(closeOnlyContextMenuReset)
			closeOnlyContextMenuReset = setTimeout(clearCloseOnlyContextMenuGesture, 500)
			contextMenu.close()
		}
		const contextHandler = (e: MouseEvent) => {
			e.preventDefault()
			e.stopPropagation()

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

			contextMenu.open({ x: e.clientX, y: e.clientY })
		}

		document.addEventListener('pointerdown', pointerHandler as EventListener, true)
		$element.addEventListener('contextmenu', contextHandler as EventListener)
		return attachments.add(() => {
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

		window.addEventListener('blur', closeForPageUnfocus)
		document.addEventListener('visibilitychange', closeForVisibilityChange)
		releasePageUnfocus = () => {
			window.removeEventListener('blur', closeForPageUnfocus)
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

function getPointOpenDefaults(
	positionAt: GooContextMenuOpenOptions['at'],
	opts: Omit<GooContextMenuOpenOptions, 'at' | 'x' | 'y'>
): Pick<GooContextMenuOpenOptions, 'align' | 'offset'> {
	if (!isPointAnchor(positionAt)) return {}
	return {
		align: opts.align ?? positionAt.align ?? 'left top to right top',
		offset: opts.offset ?? positionAt.offset ?? { x: DEFAULT_CURSOR_GAP_X, y: 0 }
	}
}

function getPointOpenAnchor(
	positionAt: GooContextMenuOpenOptions['at'],
	opts: Omit<GooContextMenuOpenOptions, 'at' | 'x' | 'y'>
): GooContextMenuOpenOptions['at'] {
	if (!isPointAnchor(positionAt)) return positionAt
	if (opts.align || opts.offset || positionAt.align || positionAt.offset) return positionAt

	const pointX = positionAt.point?.x ?? positionAt.x ?? 0
	const pointY = positionAt.point?.y ?? positionAt.y ?? 0
	return {
		...positionAt,
		point: {
			x: pointX,
			y: pointY - DEFAULT_CURSOR_ARROW_TIP_OFFSET_Y
		}
	}
}

function isPointAnchor(positionAt: GooContextMenuOpenOptions['at']): positionAt is Exclude<GooContextMenuOpenOptions['at'], HTMLElement | undefined> {
	if (!positionAt || positionAt instanceof HTMLElement) return false
	if (positionAt.element) return false
	return Boolean(positionAt.point || positionAt.x !== undefined || positionAt.y !== undefined)
}
