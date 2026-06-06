import type { GooSliderDirection, GooSliderElement, GooSliderPreset, GooSliderShape, GooSliderUnit } from '../slider/types.ts'

export type GooRangeModuleValue = number | number[] | { min: number; max: number } | { x: number; y: number }
export type GooRangeModuleState = 'input' | 'change' | 'set'

export type GooRangeModuleEventData = {
	element: GooRangeModuleElement
	index: number
	slider: GooSliderElement | null
	state: GooRangeModuleState
	value: number
	values: number[]
	originalEvent?: Event
}

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

export type GooRangeModuleRangeApi = {
	$element: HTMLElement
	state: GooRangeModuleState | 'load'
	get thumbs(): GooSliderElement['thumbs']
	get values(): number[]
	getValue(): GooRangeModuleValue
	setAnimate(index: number, animate: boolean): void
	setValue(value: GooRangeModuleValue, options?: { silent?: boolean }): void
	toPercent(value: number): number
}
