import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Data emitted by Goo color input/change events. */
export interface GooColorEventData {

	/** Color element that emitted the event. */
	color: GooColorElement

	/** Updated color value. */
	value: string

	/** Update state such as `input`, `change`, or `set`. */
	state: 'change' | 'input' | 'set'

	/** Original browser event when available. */
	event?: Event
}

/** Props accepted by the Svelte `GooColor` component. */
export type GooColorProps = GooForwardedAttributes & {

	/** Current color value. */
	value?: string

	/** Show alpha slider and preserve alpha in the value. */
	alpha?: boolean

	/** Show the native browser color picker from the swatch. */
	nativePicker?: boolean

	/** Native form field name. */
	name?: string

	/** Element id. */
	id?: string

	/** Element title. */
	title?: string

	/** Accessible label for the color picker control. */
	ariaLabel?: string

	/** Whether the color input is disabled. */
	disabled?: boolean

	/** Extra class names. */
	class?: string

	/** Inline style string. */
	style?: string

	/** Tab index for text and picker inputs. */
	tabIndex?: number

	/** Optional child content. */
	children?: Snippet

	/** Bound native color element for imperative updates. */
	element?: GooColorElement | null

	/** Change callback fired on commit. */
	onchange?: (value: string, data: GooColorEventData) => void

	/** Input callback fired while editing. */
	oninput?: (value: string, data: GooColorEventData) => void

}

/** Native root element bound by `GooColor` for imperative updates. */
export type GooColorElement = HTMLDivElement & {

	/** Current color value. */
	value: string

	/** Set color value. 	 * @param value - value.
 * @param options - options.
 */
	setValue(value: string, options?: { silent?: boolean }): void

	/** Get current color value. */
	getValue(): string

	/** Enable the color input. */
	enable(): void

	/** Disable the color input. */
	disable(): void

	/** Focus the text input. */
	focus(): void

	/** Blur the text input. */
	blur(): void
}
