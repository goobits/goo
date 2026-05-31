import type { Snippet } from 'svelte'

/** Button group layout direction. */
export type GooButtonGroupLayout = 'horizontal' | 'vertical'

/** Option accepted by Goo button group renderers and components. */
export interface ButtonGroupOption {

	/** Visible button label. */
	value?: string | number

	/** Stable selection key. Defaults to `value`. */
	key?: string | number

	/** Stable selection id used when `key` is omitted. */
	id?: string | number

	/** Visible fallback label used when `value` is omitted. */
	label?: string | number

	/** Optional icon class or factory node rendered before the title. */
	icon?: string | (() => Element)

	/** Tooltip/title text. */
	tooltip?: string

	/** Additional class names for the button. */
	className?: string
}

/** Normalized button group option with an explicit key. */
export interface NormalizedButtonGroupOption {

	/** Stable selection key. */
	key: string

	/** Visible button label. */
	value: string

	/** Optional icon class or factory node rendered before the title. */
	icon?: string | (() => Element)

	/** Tooltip/title text. */
	tooltip?: string

	/** Additional class names for the button. */
	className?: string
}

/** Button group options collection. */
export type ButtonGroupOptions = Array<string | ButtonGroupOption> | Record<string, string | ButtonGroupOption>

/** Props accepted by the Svelte `GooButtonGroup` component. */
export type GooButtonGroupProps = {

	/** Button definitions to render. Existing child buttons are used when omitted. */
	options?: ButtonGroupOptions

	/** Selected key or keys. */
	value?: string | string[] | null

	/** Allow multiple buttons to be selected. */
	allowMultiple?: boolean

	/** Allow selected buttons to be toggled off. Defaults to `allowMultiple`. */
	allowToggle?: boolean

	/** Layout direction. */
	layout?: GooButtonGroupLayout

	/** Whether the group is disabled. */
	disabled?: boolean

	/** Additional class names. */
	className?: string

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

	/** Button children. Used when `options` is omitted. */
	children?: Snippet

	/** Callback fired with the full selected value after a selection change. */
	onchange?: (value: string | string[] | null) => void

	/** Native attributes forwarded to the rendered group. */
	[key: string]: unknown
}
