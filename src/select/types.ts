/**
 * @fileoverview Type definitions for GooSelect.
 * @module goobits/select/types
 */

import type { Snippet } from 'svelte'

import type { GooPopoutOptions } from '../popout/popout.ts'

/**
 * Single option in a GooSelect menu.
 */
export interface GooSelectOption {
	type?: 'option' | 'divider' | 'optgroup' | 'submenu'
	label?: string | HTMLElement | (() => string | HTMLElement)
	id?: string
	icon?: string | HTMLElement | (() => string | HTMLElement)
	shortcut?: string | string[] | (() => string | string[])
	isDisabled?: boolean | (() => boolean)
	isSupported?: boolean | (() => boolean)
	onChoose?: (id: string) => void
	options?: GooSelectOption[]
	title?: string
}

/**
 * State interface for GooSelect.
 */
export interface GooSelectState {
	value: string
	placeholder: string
	enableKeyboard: boolean
	showSelectionIndicator: boolean
	showHeader: boolean
	disabled: boolean
	[key: string]: unknown
}

/** Supported placement values for a GooSelect menu. */
export type GooSelectMenuPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'

/** Display options for the dropdown menu owned by a GooSelect. */
export type GooSelectMenuOptions = {
	arrow?: boolean
	backdrop?: boolean
	offset?: { x?: number; y?: number }
	outline?: boolean
	placement?: GooSelectMenuPlacement
	popoutClassName?: string
	variant?: 'attached' | 'floating'
	width?: 'auto' | 'content' | 'trigger'
}

/** Props accepted by the Svelte `GooSelect` component. */
export type GooSelectProps = {
	options?: readonly string[] | readonly GooSelectOption[] | Record<string, unknown>
	value?: string
	enableKeyboard?: boolean
	/** Whether the open menu marks the current value with a check indicator. */
	showSelectionIndicator?: boolean
	showHeader?: boolean
	menu?: GooSelectMenuOptions

	/** Extra class names. */
	class?: string

	style?: string
	id?: string
	size?: string
	name?: string
	placeholder?: string
	tooltip?: string | (() => string)
	title?: string
	disabled?: boolean
	boundContext?: unknown
	triggerIcon?: string | HTMLElement | (() => HTMLElement)

	/** Optional child content. */
	children?: Snippet

	/** Bound native select element for imperative updates. */
	element?: GooSelectElement | null

	/** Change callback fired after selection. */
	onchange?: (value: string, data: GooSelectEventData) => void

	/** Open callback. */
	onopen?: () => void

	/** Close callback. */
	onclose?: () => void

	/** Native attributes forwarded to the select root. */
	[key: string]: unknown
}

/** Data emitted by select change events. */
export interface GooSelectEventData {

	/** Select element that emitted the event. */
	select: GooSelectElement

	/** Current option id. */
	value: string

	/** Previous option id. */
	oldValue: string
}

/** Panel surface required by select host and keyboard helpers. */
export interface GooSelectPanelHost {
	hoveredId: string | null
	/**
 * Navigate.
 *
 * @param dir - dir.
 */
	navigate(dir: 1 | -1): void
	/**
	 * Gets hovered element.
	 */
	getHoveredElement(): HTMLElement | null
	/**
	 * Finds option by id.
	 *
	 * @param id - id.
	 */
	findOptionById(id: string): GooSelectOption | null
	/**
	 * Open submenu.
	 *
	 * @param $item - $item.
	 * @param opt - opt.
	 */
	openSubmenu($item: HTMLElement, opt: GooSelectOption): void
	/**
	 * Close submenu.
	 */
	closeSubmenu(): void
	/**
	 * Handles typeahead.
	 *
	 * @param char - char.
	 */
	handleTypeahead(char: string): void
}

/** Host surface required by keyboard helpers. */
export interface GooSelectKeyboardHost {
	state: GooSelectState
	_opened: boolean
	_panel: GooSelectPanelHost | null
	_selectOptions: GooSelectOption[]
	$trigger: HTMLElement | null
	open: () => boolean
	close: () => void
	_selectOption: (opt: GooSelectOption) => void
	_getContext: () => unknown
}

/** Native root element bound by `GooSelect` for imperative updates. */
export type GooSelectElement = HTMLDivElement & GooSelectKeyboardHost & {

	/** Current option id. */
	value: string

	/** Whether the dropdown is open. */
	opened: boolean

	/** Current hovered option id. */
	hovered: string | null

	/** Available select options. */
	options: GooSelectOption[]

	/** Set option id. 	 * @param value - value.
 * @param options - options.
 */
	setValue(value: string, options?: { silent?: boolean }): void

	/** Get option id. */
	getValue(): string

	/** Replace available options. 	 * @param options - options.
	 */
	setOptions(options: readonly string[] | readonly GooSelectOption[] | Record<string, unknown>): void

	/** Set or update the trigger icon. 	 * @param icon - icon.
	 */
	setTriggerIcon(icon: string | HTMLElement | (() => HTMLElement) | null): void

	/** Open the dropdown. 	 * @param options - options.
	 */
	open(options?: GooSelectOpenOptions): boolean

	/** Close the dropdown. 	 * @param options - options.
	 */
	close(options?: { quiet?: boolean }): void

	/** Toggle the dropdown. */
	toggle(): void

	/** Enable the select. */
	enable(): void

	/** Disable the select. */
	disable(): void

	/** Focus the trigger. */
	focus(): void

	/** Blur the trigger. */
	blur(): void

	/** Set bound callback context. 	 * @param context - context.
	 */
	setBoundContext(context: unknown): void
}

/**
 * Options for opening the select dropdown.
 */
export interface GooSelectOpenOptions {
	autoFocus?: boolean
	at?: HTMLElement | { x: number; y: number }
	clickToClose?: GooPopoutOptions['clickToClose']
	keepWithin?: { $element?: HTMLElement; margin?: number }
	parentElement?: HTMLElement
	boundContext?: unknown

	/** Override the popout alignment string (e.g. `'left top to left bottom'`). */
	align?: string

	/** Override the popout offset. */
	offset?: { x?: number; y?: number }
}
