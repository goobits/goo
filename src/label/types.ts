import type { Snippet } from 'svelte'

/** Props for the Goo label component. */
export interface GooLabelProps {

	/** ID of the input associated with this label. */
	for?: string

	/** Shows the required-field indicator. */
	required?: boolean

	/** Renders the label in a disabled visual state. */
	disabled?: boolean

	/** Additional CSS classes. */
	class?: string

	/** Inline style forwarded to the label element. */
	style?: string

	/** Label contents. */
	children?: Snippet
}
