/**
 * @fileoverview createGooContextMenu - Right-click context menu
 * Thin wrapper around GooSelect for context menu use cases.
 * @module goo/context-menu
 */

import { createSelectField } from '../select/_createSelectField.ts'
import type { GooSelectElement, GooSelectMenuOptions, GooSelectOption } from '../select/index.ts'

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
	boundContext?: unknown
	id?: string
	selected?: string
	value?: string
	onopen?: () => void
	onclose?: () => void
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
export function createGooContextMenu(options: GooContextMenuOptions = {}): GooSelectElement {
	const {
		options: menuOptions = [],
		enableKeyboard = true,
		showSelectionIndicator = false,
		menu = {},
		className = '',
		boundContext,
		id,
		selected,
		value,
		onopen,
		onclose
	} = options

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
			...menu
		},
		className: `goo-context-menu ${ className }`.trim(),
		boundContext,
		onopen,
		onclose
	})

	// Override open to accept position coordinates directly
	type SelectWithOpen = GooSelectElement & { open: (opts?: Record<string, unknown>) => void }
	const originalOpen = (select as SelectWithOpen).open.bind(select);
	(select as SelectWithOpen).open = function openContextMenu(opts: {
		x?: number
		y?: number
		at?: { x: number; y: number }
		autoFocus?: boolean
		align?: string
		offset?: { x?: number; y?: number }
	} = {}) {
		const { x, y, at, ...restOpts } = opts

		// Accept x/y directly or via at object
		let positionAt = at
		if (x !== undefined || y !== undefined) {
			positionAt = { x: x ?? 0, y: y ?? 0 }
		}

		return originalOpen({
			...restOpts,
			at: positionAt,
			autoFocus: opts.autoFocus !== false
		})
	}

	// Add convenience method for right-click handling
	type SelectWithMethods = GooSelectElement & {
		attachTo: (el: HTMLElement, handler?: (e: MouseEvent) => false | { options?: GooContextMenuOption[] } | void) => () => void
		setOptions: (options: GooContextMenuOption[]) => void
		open: (opts?: { x?: number; y?: number; align?: string; offset?: { x?: number; y?: number } }) => void
	}
	;(select as SelectWithMethods).attachTo = function attachTo($element: HTMLElement, handler?: (e: MouseEvent) => false | { options?: GooContextMenuOption[] } | void) {
		const contextHandler = (e: MouseEvent) => {
			e.preventDefault()
			e.stopPropagation()

			// Allow handler to modify options or cancel
			if (handler) {
				const result = handler(e)
				if (result === false) return
				if (result && typeof result === 'object' && 'options' in result && result.options) {
					(select as SelectWithMethods).setOptions(result.options)
				}
			}

			(select as SelectWithMethods).open({ x: e.clientX, y: e.clientY })
		}

		$element.addEventListener('contextmenu', contextHandler as EventListener)

		// Return cleanup function
		return () => {
			$element.removeEventListener('contextmenu', contextHandler as EventListener)
		}
	}

	return select as GooSelectElement
}
