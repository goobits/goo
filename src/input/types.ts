import type { Snippet } from 'svelte'
import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Native text input type supported by Goo input. */
export type GooInputType = 'email' | 'password' | 'search' | 'tel' | 'text' | 'url' | string

/** Visual treatment for a Goo input. */
export type GooInputVariant = 'default' | 'bare'

/** Props accepted by the Svelte `GooInput` component. */
export type GooInputProps<T = string> = GooForwardedAttributes & {

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

	/** ID of a native datalist providing suggestions. */
	list?: string

	/** Native input id. */
	inputId?: string

	/** Accessible label for the native input element. */
	ariaLabel?: string

	/** Native autocomplete hint. */
	autocomplete?: HTMLInputAttributes['autocomplete'] | HTMLTextareaAttributes['autocomplete']

	/** Native spellcheck setting. */
	spellcheck?: HTMLInputAttributes['spellcheck'] | HTMLTextareaAttributes['spellcheck']

	/** Native autocapitalize hint. */
	autocapitalize?: HTMLInputAttributes['autocapitalize'] | HTMLTextareaAttributes['autocapitalize']

	/** Native virtual-keyboard input mode. */
	inputmode?: HTMLInputAttributes['inputmode'] | HTMLTextareaAttributes['inputmode']

	/** Native minimum input length. */
	minLength?: number

	/** Native maximum input length. */
	maxLength?: number

	/** Focus the native input when mounted. */
	autofocus?: boolean

	/** IDs of elements describing the native input. */
	'aria-describedby'?: string

	/** Native input validation state. */
	'aria-invalid'?: boolean | 'false' | 'grammar' | 'spelling' | 'true'

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

	/** Fill the available inline width. */
	block?: boolean

	/** Visual treatment. Bare inputs defer their chrome to a composite parent. */
	variant?: GooInputVariant

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
	onblur?: (value: T) => void

	/** Keydown callback fired from the native input before Goo default handling. */
	onkeydown?: (event: KeyboardEvent) => void

}

/** Props accepted by the Svelte `GooNumber` component. */
export type GooNumberProps = GooForwardedAttributes & {

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

	/** Render an auto toggle with this label; the value dims while auto. */
	autoLabel?: string

	/** Auto state shown by the toggle. */
	auto?: boolean

	/** Called when the auto toggle is pressed. */
	onautotoggle?: (auto: boolean) => void

	/** Native form field name. */
	name?: string

	/** Native input id. */
	inputId?: string

	/** Accessible label for the native number input element. */
	ariaLabel?: string

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

}
