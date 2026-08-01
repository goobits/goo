import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Props accepted by the Svelte `GooFocusTrap` component. */
export type GooFocusTrapProps = GooForwardedAttributes & {

	/** Accessible dialog label when no visible heading owns the label. */
	ariaLabel?: string

	/** Id of the visible heading that labels the dialog. */
	ariaLabelledby?: string

	/** Dialog content. */
	children: Snippet

	/** Extra class names applied to the dialog root. */
	class?: string

	/** Native click callback for the dialog root. */
	onclick?: (event: MouseEvent) => void

	/** Called after the trap contains an Escape key press. */
	onEscape?: () => void

	/** Accessible role for the modal root. */
	role?: 'dialog'
}
