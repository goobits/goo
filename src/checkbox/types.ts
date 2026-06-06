import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Props accepted by the Svelte `GooCheckbox` component. */
export type GooCheckboxProps = GooForwardedAttributes & {

	/** Current checked state. */
	value?: boolean

	/** Alias for value. */
	checked?: boolean

	/** Optional visible label. */
	label?: string

	/** Native form field name. */
	name?: string

	/** Element id. */
	id?: string

	/** Element title. */
	title?: string

	/** Accessible label when no visible label is available. */
	ariaLabel?: string

	/** Submitted form value when checked. */
	formValue?: string

	/** Whether the checkbox is disabled. */
	disabled?: boolean

	/** Extra class names. */
	class?: string

	/** Inline style. */
	style?: string

	/** Tab index for keyboard focus. */
	tabIndex?: number

	/** Checkbox content. */
	children?: Snippet

	/** Change callback. */
	onchange?: (value: boolean, oldValue?: boolean) => void

}
