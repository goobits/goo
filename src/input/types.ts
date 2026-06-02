import type { Snippet } from 'svelte'

/** Native text input type supported by Goo input. */
export type GooInputType = 'email' | 'password' | 'search' | 'tel' | 'text' | 'url' | string

/** Props accepted by the Svelte `GooInput` component. */
export type GooInputProps<T = string> = {

	/** Current text value. */
	value?: T

	/** Placeholder shown when the input is empty. */
	placeholder?: string

	/** Native input type for single-line inputs. */
	type?: GooInputType

	/** Render a textarea-style multi-line input. */
	multiline?: boolean

	/** Native form field name. */
	name?: string

	/** Native input id. */
	inputId?: string

	/** Accessible label for the native input element. */
	ariaLabel?: string

	/** Native autocomplete hint. */
	autocomplete?: string

	/** Native spellcheck setting. */
	spellcheck?: boolean | 'false' | 'true'

	/** Native autocapitalize hint. */
	autocapitalize?: string

	/** Element id. */
	id?: string

	/** Element title. */
	title?: string

	/** Whether the input is disabled. */
	disabled?: boolean

	/** Whether the input is read-only. */
	readonly?: boolean

	/** Whether a value is required. */
	required?: boolean

	/** Compact/medium size token. */
	size?: string

	/** Extra class names. */
	class?: string

	/** Inline style string. */
	style?: string

	/** Tab index for keyboard focus. */
	tabIndex?: number

	/** Input content. */
	children?: Snippet

	/** Input callback. */
	oninput?: (value: T, oldValue?: T) => void

	/** Change callback. */
	onchange?: (value: T, oldValue?: T) => void

	/** Focus callback. */
	onfocus?: () => void

	/** Blur callback. */
	onblur?: () => void

	/** Keydown callback fired from the native input before Goo default handling. */
	onkeydown?: (event: KeyboardEvent) => void

	/** Native attributes forwarded to the rendered control. */
	[key: string]: unknown
}

/** Props accepted by the Svelte `GooNumber` component. */
export type GooNumberProps = {

	/** Current numeric value. */
	value?: number

	/** Minimum allowed value. */
	min?: number

	/** Maximum allowed value. */
	max?: number

	/** Spinner step; `any` uses Goo's default effective step. */
	step?: number | 'any'

	/** Display unit suffix. */
	unit?: string

	/** Native form field name. */
	name?: string

	/** Native input id. */
	inputId?: string

	/** Element id. */
	id?: string

	/** Element title. */
	title?: string

	/** Whether the input is disabled. */
	disabled?: boolean

	/** Compact/medium size token. */
	size?: string

	/** Extra class names. */
	class?: string

	/** Inline style string. */
	style?: string

	/** Tab index for keyboard focus. */
	tabIndex?: number

	/** Input callback. */
	oninput?: (value: number, oldValue?: number) => void

	/** Change callback. */
	onchange?: (value: number, oldValue?: number) => void

	/** Enter key callback. */
	onenter?: () => void

	/** Focus callback. */
	onfocus?: () => void

	/** Blur callback. */
	onblur?: () => void

	/** Native attributes forwarded to the rendered control. */
	[key: string]: unknown
}
