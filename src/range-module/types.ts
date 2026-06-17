import type { GooSliderDirection, GooSliderElement, GooSliderPreset, GooSliderShape, GooSliderUnit } from '../slider/types.ts'

/** Goo Range Module Value typed model for range-module controls. */
export type GooRangeModuleValue = number | number[] | { min: number; max: number } | { x: number; y: number }
/** Goo Range Module State typed model for range-module controls. */
export type GooRangeModuleState = 'input' | 'change' | 'set'

/** Goo Range Module Event Data typed model for range-module controls. */
export type GooRangeModuleEventData = {
	element: GooRangeModuleElement
	index: number
	slider: GooSliderElement | null
	state: GooRangeModuleState
	value: number
	values: number[]
	originalEvent?: Event
}

/** Goo Range Module Options typed model for range-module controls. */
export type GooRangeModuleOptions = {
	canCross?: boolean
	canPush?: boolean
	class?: string
	className?: string
	coverage?: boolean
	direction?: GooSliderDirection
	disabled?: boolean
	easingFn?: (pct: number) => number
	easingFnInvert?: (pct: number) => number
	gradient?: string[]
	input?: boolean
	label?: string
	max?: number
	min?: number
	name?: string
	onchange?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	onChange?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	oninput?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	onInput?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	preset?: GooSliderPreset
	presetColor?: string
	presetHue?: number
	presetSaturation?: number
	shape?: GooSliderShape
	showInputs?: boolean
	step?: number
	style?: string
	tabIndex?: number
	title?: string
	unit?: GooSliderUnit
	value?: GooRangeModuleValue
}

/** Goo Range Module Element typed model for range-module controls. */
export type GooRangeModuleElement = HTMLDivElement & {
	destroy(): void
	disable(): void
	enable(): void
	getRange(): GooRangeModuleRangeApi
	getValue(): GooRangeModuleValue
	setOptions(options: Partial<GooRangeModuleOptions>): void
	setValue(value: GooRangeModuleValue, options?: { silent?: boolean }): void
	value: GooRangeModuleValue
}

/** Goo Range Module Range Api typed model for range-module controls. */
export type GooRangeModuleRangeApi = {
	element: HTMLElement
	getState(): GooRangeModuleState | 'load'
	get values(): number[]
	getValue(): GooRangeModuleValue
	setAnimate(index: number, animate: boolean): void
	setValue(value: GooRangeModuleValue, options?: { silent?: boolean }): void
	toPercent(value: number): number
}
