import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Props accepted by the Svelte `GooTextarea` component. */
export type GooTextareaProps = GooForwardedAttributes & {

	/** Current text value. */
	value?: string

	/** Placeholder shown when the textarea is empty. */
	placeholder?: string

	/** Native form field name. */
	name?: string

	/** Element id. */
	id?: string

	/** Native textarea id, used to associate a `GooLabel` `for` target. */
	inputId?: string

	/** Element title. */
	title?: string

	/** Number of visible rows. */
	rows?: number

	/** Number of visible columns. */
	cols?: number

	/** Minimum text length. */
	minLength?: number

	/** Maximum text length. */
	maxLength?: number

	/** Whether the textarea is disabled. */
	disabled?: boolean

	/** Whether the textarea is read-only. */
	readonly?: boolean

	/** Whether a value is required. */
	required?: boolean

	/** Extra class names. */
	class?: string

	/** Inline style string. */
	style?: string

	/** Tab index for keyboard focus. */
	tabIndex?: number

	/** Textarea content. */
	children?: Snippet

	/** Input callback. */
	oninput?: (value: string, oldValue?: string) => void

	/** Change callback. */
	onchange?: (value: string, oldValue?: string) => void

}
