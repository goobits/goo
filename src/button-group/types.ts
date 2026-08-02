import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Button group layout direction. */
export type GooButtonGroupLayout = 'horizontal' | 'vertical'

/** Option accepted by Goo button group renderers and components. */
export interface ButtonGroupOption {

	/** Stable selection id. */
	id: string | number

	/** Visible button label. */
	label: string | number

	/** Optional icon class or factory node rendered before the title. */
	icon?: string | (() => Element)

	/** Native title tooltip text. */
	title?: string

	/** Accessible label for icon-only buttons. Defaults to `title` or visible text. */
	ariaLabel?: string

	/** Hide the visible title while keeping the option keyboard/selectable. */
	hideLabel?: boolean

	/** Additional class names for the button. */
	className?: string

	/** Disable this option while keeping it visible in the group. */
	disabled?: boolean
}

/** Normalized button group option. */
export interface NormalizedButtonGroupOption {

	/** Stable selection id. */
	id: string

	/** Visible button label. */
	label: string

	/** Optional icon class or factory node rendered before the title. */
	icon?: string | (() => Element)

	/** Native title tooltip text. */
	title?: string

	/** Accessible label for icon-only buttons. Defaults to `title` or visible text. */
	ariaLabel?: string

	/** Hide the visible title while keeping the option keyboard/selectable. */
	hideLabel?: boolean

	/** Additional class names for the button. */
	className?: string

	/** Disable this option while keeping it visible in the group. */
	disabled?: boolean
}

/** Value accepted under an id-keyed button group option map. */
type ButtonGroupOptionMapValue = string | Omit<ButtonGroupOption, 'id'>

/** Button group options collection. */
export type ButtonGroupOptions = Array<string | ButtonGroupOption> | Record<string, ButtonGroupOptionMapValue>

/** Props accepted by the Svelte `GooButtonGroup` component. */
export type GooButtonGroupProps = GooForwardedAttributes & {

	/** Button definitions to render. Existing child buttons are used when omitted. */
	options?: ButtonGroupOptions

	/** Selected id or ids. */
	value?: string | string[] | null

	/** Allow multiple buttons to be selected. */
	allowMultiple?: boolean

	/** Allow selected buttons to be toggled off. Defaults to `allowMultiple`. */
	allowToggle?: boolean

	/** Layout direction. */
	layout?: GooButtonGroupLayout

	/** Whether the group is disabled. */
	disabled?: boolean

	/** Compact/medium size token. */
	size?: string

	/** Inline style string. */
	style?: string

	/** Tab index for keyboard focus. */
	tabIndex?: number

	/** Extra class names. */
	class?: string

	/** Accessible label for the button group. */
	label?: string

	/** Direct button children identified by `data-id`. Used when `options` is omitted. */
	children?: Snippet

	/** Callback fired with the full selected value after a selection change. */
	onchange?: (value: string | string[] | null) => void

}
