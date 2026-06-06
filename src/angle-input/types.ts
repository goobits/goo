import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Supported Goo angle input units. */
export type GooAngleInputUnit = 'degree' | 'radian'

/** Data emitted by angle input change/input events. */
export interface GooAngleInputEventData {

	/** Angle input element that emitted the event. */
	angleInput: GooAngleInputElement

	/** Updated angle value in the configured unit. */
	value: number

	/** Update state such as `input`, `change`, or `set`. */
	state: 'change' | 'input' | 'set'

	/** Original browser event when available. */
	event?: Event
}

/** Props accepted by the Svelte `GooAngleInput` component. */
export type GooAngleInputProps = GooForwardedAttributes & {

	/** Current angle value in the configured unit. */
	value?: number | string

	/** Unit for the public value. */
	unit?: GooAngleInputUnit

	/** Native form field name. */
	name?: string

	/** Element id. */
	id?: string

	/** Element title. */
	title?: string

	/** Whether the angle input is disabled. */
	disabled?: boolean

	/** Extra class names. */
	class?: string

	/** Inline style string. */
	style?: string

	/** Tab index for the number input. */
	tabIndex?: number

	/** Optional child content. */
	children?: Snippet

	/** Bound native angle input element for imperative updates. */
	element?: GooAngleInputElement | null

	/** Change callback fired on commit. */
	onchange?: (value: number, data: GooAngleInputEventData) => void

	/** Input callback fired while dragging or typing. */
	oninput?: (value: number, data: GooAngleInputEventData) => void

}

/** Native root element bound by `GooAngleInput` for imperative updates. */
export type GooAngleInputElement = HTMLDivElement & {

	/** Current angle value in the configured unit. */
	value: number

	/** Current unit. */
	unit: GooAngleInputUnit

	/** Set the angle value in the configured unit. 	 * @param value - value.
 * @param options - options.
 */
	setValue(value: number | string, options?: { silent?: boolean }): void

	/** Get the angle value in the configured unit. */
	getValue(): number

	/** Enable the angle input. */
	enable(): void

	/** Disable the angle input. */
	disable(): void

	/** Focus the nested number input. */
	focus(): void

	/** Blur the nested number input. */
	blur(): void
}
