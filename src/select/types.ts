/**
 * @fileoverview Type definitions for GooSelect.
 * @module goobits/select/types
 */

import type { Snippet } from 'svelte'

import type { GooPopoutAt, GooPopoutOptions } from '../popout/popout.ts'
import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Host-owned action context passed through menu/select actions. */
export type GooSelectActionContext = unknown

/** Renderable label/icon content accepted by GooSelect options. */
export type GooSelectRenderable = string | HTMLElement | (() => string | HTMLElement)

/** Shortcut text accepted by GooSelect options. */
export type GooSelectShortcut = string | string[] | (() => string | string[])

/**
 * Single option in a GooSelect menu.
 */
export interface GooSelectOption {
	type?: 'option' | 'divider' | 'optgroup' | 'submenu'
	label?: GooSelectRenderable
	id?: string
	/** Visual tone. `'danger'` styles the row as destructive (negative color). */
	tone?: 'danger'
	icon?: GooSelectRenderable
	shortcut?: GooSelectShortcut
	isDisabled?: boolean | (() => boolean)
	isSupported?: boolean | (() => boolean)
	onChoose?: (id: string) => void
	options?: GooSelectOption[]
	title?: string
}

/** Shorthand option accepted by GooSelect option inputs. */
export type GooSelectOptionInput = string | GooSelectOption

/** Object-map value accepted by GooSelect option inputs. */
export type GooSelectOptionMapValue =
	| string
	| number
	| GooSelectOption
	| readonly GooSelectOptionInput[]
	| GooSelectOptionMap

/** Object-map shorthand accepted by GooSelect option inputs. */
export type GooSelectOptionMap = {
	[id: string]: GooSelectOptionMapValue
}

/** Options accepted by GooSelect before normalization. */
export type GooSelectOptionsInput = readonly GooSelectOptionInput[] | GooSelectOptionMap

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

/** ARIA semantics used by the shared dropdown renderer. */
export type GooSelectDropdownSemantics = {
	/** Role applied to the dropdown content element. */
	containerRole: 'listbox' | 'menu'
	/** Role applied to selectable rows. */
	optionRole: 'option' | 'menuitem'
	/** Role announced by a trigger that opens this dropdown. */
	popupRole: 'listbox' | 'menu'
	/** Whether rows should expose `aria-selected`. */
	usesSelectedState: boolean
}

/** Display options for the dropdown menu owned by a GooSelect. */
export type GooSelectMenuOptions = {
	arrow?: boolean
	backdrop?: boolean
	offset?: { x?: number; y?: number }
	outline?: boolean
	placement?: GooSelectMenuPlacement
	popoutClassName?: string
	semantics?: GooSelectDropdownSemantics
	variant?: 'attached' | 'floating'
	width?: 'auto' | 'content' | 'trigger'
}

/** Event names emitted by a GooSelect element. */
export type GooSelectEventName = 'change' | 'open' | 'close'

/** Change callback fired after selection. */
export type GooSelectChangeHandler = (value: string, data: GooSelectEventData) => void

/** Open callback fired after the dropdown opens. */
export type GooSelectOpenHandler = () => void

/** Close callback fired after the dropdown closes. */
export type GooSelectCloseHandler = () => void

/** Props accepted by the Svelte `GooSelect` component. */
export type GooSelectProps = GooForwardedAttributes & {
	options?: GooSelectOptionsInput
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
	ariaLabel?: string
	tooltip?: string | (() => string)
	title?: string
	disabled?: boolean
	actionContext?: GooSelectActionContext
	triggerIcon?: string | HTMLElement | (() => HTMLElement)

	/** Optional child content. */
	children?: Snippet

	/** Bound native select element for imperative updates. */
	element?: GooSelectElement | null

	/** Change callback fired after selection. */
	onchange?: GooSelectChangeHandler

	/** Open callback. */
	onopen?: GooSelectOpenHandler

	/** Close callback. */
	onclose?: GooSelectCloseHandler

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

/** Native root element bound by `GooSelect` for imperative updates. */
export type GooSelectElement = HTMLDivElement & {

	/** Destroy the mounted select and remove it from the DOM. */
	destroy(): void

	/** Current option id. */
	value: string

	/** Set option id. 	 * @param value - value.
	 * @param options - options.
	 */
	setValue(value: string, options?: { silent?: boolean }): void

	/** Get option id. */
	getValue(): string

	/** Whether the dropdown is open. */
	isOpen(): boolean

	/** Reposition the open dropdown. */
	updatePosition(options?: GooSelectOpenOptions): boolean

	/** Current hovered option id, if the menu is open. */
	getHoveredOptionId(): string | null

	/** Available select options. */
	getOptions(): GooSelectOption[]

	/** Replace available options. 	 * @param options - options.
	 */
	setOptions(options: GooSelectOptionsInput): void

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
}

/**
 * Options for opening the select dropdown.
 */
export interface GooSelectOpenOptions {
	autoFocus?: boolean
	at?: HTMLElement | GooPopoutAt
	clickToClose?: GooPopoutOptions['clickToClose']
	keepWithin?: { element?: HTMLElement; margin?: number }
	parentElement?: HTMLElement
	actionContext?: GooSelectActionContext

	/** Override the popout alignment string (e.g. `'left top to left bottom'`). */
	align?: string

	/** Override the popout offset. */
	offset?: { x?: number; y?: number }

	/** Extra class names appended to this open call's popout. */
	popoutClassName?: string
}
