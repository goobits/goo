/** Goo Xy Pad Value request or option shape for XY pad controls. */
export interface GooXyPadValue {
	x: number
	y: number
}

/** Goo Xy Pad State typed model for XY pad controls. */
export type GooXyPadState = 'input' | 'change' | 'set'

/** Goo Xy Pad Event Data request or option shape for XY pad controls. */
export interface GooXyPadEventData {
	element: GooXyPadElement
	event?: Event
	state: GooXyPadState
	value: GooXyPadValue
}

/** Goo Xy Pad Props request or option shape for XY pad controls. */
export interface GooXyPadProps {
	value?: GooXyPadValue | number[] | null
	min?: number
	max?: number
	step?: number
	unit?: string
	label?: string
	name?: string
	id?: string
	title?: string
	ariaLabel?: string
	'aria-label'?: string
	disabled?: boolean
	class?: string
	style?: string
	tabIndex?: number
	snap?: number
	showInputs?: boolean
	resettable?: boolean
	element?: GooXyPadElement | null
	onchange?: (value: GooXyPadValue, data: GooXyPadEventData) => void
	oninput?: (value: GooXyPadValue, data: GooXyPadEventData) => void
	children?: import('svelte').Snippet
}

/** Goo Xy Pad Element typed model for XY pad controls. */
export type GooXyPadElement = HTMLDivElement & {
	value: GooXyPadValue
	disable(): void
	enable(): void
	getValue(): GooXyPadValue
	setValue(value: GooXyPadValue | number[] | null | undefined, options?: { silent?: boolean }): void
	focus(): void
	blur(): void
}
