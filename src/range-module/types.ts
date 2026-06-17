import type {
	GooSliderDirection,
	GooSliderElement,
	GooSliderMark,
	GooSliderMode,
	GooSliderPreset,
	GooSliderScale,
	GooSliderShape,
	GooSliderSnap,
	GooSliderTickConfig,
	GooSliderUnit,
	GooSliderValueBubble
} from '../slider/types.ts'

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
	variance?: boolean
	direction?: GooSliderDirection
	disabled?: boolean
	easingFn?: (pct: number) => number
	easingFnInvert?: (pct: number) => number
	gradient?: string[]
	input?: boolean
	label?: string
	marks?: GooSliderMark[]
	max?: number
	maxDistance?: number | string
	min?: number
	minDistance?: number | string
	mode?: GooSliderMode
	name?: string
	onchange?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	onChange?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	oninput?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	onInput?: (value: GooRangeModuleValue, data: GooRangeModuleEventData) => void
	preset?: GooSliderPreset
	presetColor?: string
	presetHue?: number
	presetSaturation?: number
	scale?: GooSliderScale
	shape?: GooSliderShape
	showInputs?: boolean
	snap?: GooSliderSnap
	step?: number
	style?: string
	tabIndex?: number
	ticks?: GooSliderTickConfig
	title?: string
	unit?: GooSliderUnit
	value?: GooRangeModuleValue
	valueBubble?: GooSliderValueBubble
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
	element: HTMLElement
	getState(): GooRangeModuleState | 'load'
	get values(): number[]
	getValue(): GooRangeModuleValue
	setAnimate(index: number, animate: boolean): void
	setValue(value: GooRangeModuleValue, options?: { silent?: boolean }): void
	toPercent(value: number): number
}
