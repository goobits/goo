import type { Snippet } from 'svelte'

/** Radio option definition. */
export interface GooRadioOption {
	value: string
	label: string
}

/** Radio option input accepted by Goo radio groups. */
export type GooRadioOptions = Array<string | GooRadioOption | { id?: string | number; label?: string | number; value?: string | number }> | Record<string, string>

/** Radio group layout direction. */
export type GooRadioGroupLayout = 'vertical' | 'horizontal'

/** Props accepted by the Svelte `GooRadio` component. */
export type GooRadioProps = {
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
	[key: string]: unknown
}

/** Props accepted by the Svelte `GooRadioGroup` component. */
export type GooRadioGroupProps = {
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
	[key: string]: unknown
}
