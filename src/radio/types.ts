import type { Snippet } from 'svelte'

import type { GooChoiceOption } from '../support/types/choiceOption.ts'
import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Radio option input accepted by Goo radio groups. */
export type GooRadioOptions = Array<string | GooChoiceOption> | Record<string, string>

/** Radio group layout direction. */
export type GooRadioGroupLayout = 'vertical' | 'horizontal'

/** Props accepted by the Svelte `GooRadio` component. */
export type GooRadioProps = GooForwardedAttributes & {
	value?: string
	label?: string
	checked?: boolean
	disabled?: boolean
	name?: string
	class?: string
	style?: string
	tabIndex?: number
	children?: Snippet
	onchange?: (value: string | null, oldValue?: string | null) => void
}

/** Props accepted by the Svelte `GooRadioGroup` component. */
export type GooRadioGroupProps = GooForwardedAttributes & {
	value?: string
	options?: GooRadioOptions
	name?: string
	disabled?: boolean
	required?: boolean
	class?: string
	style?: string
	layout?: GooRadioGroupLayout
	tabIndex?: number
	children?: Snippet
	onchange?: (value: string, oldValue?: string) => void
}
