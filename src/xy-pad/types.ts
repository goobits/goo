export interface GooXyPadValue {
	x: number
	y: number
}

export type GooXyPadState = 'input' | 'change' | 'set'

export interface GooXyPadEventData {
	element: GooXyPadElement
	event?: Event
	state: GooXyPadState
	value: GooXyPadValue
}

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

export type GooXyPadElement = HTMLDivElement & {
	value: GooXyPadValue
	disable(): void
	enable(): void
	getValue(): GooXyPadValue
	setValue(value: GooXyPadValue | number[] | null | undefined, options?: { silent?: boolean }): void
	focus(): void
	blur(): void
}
