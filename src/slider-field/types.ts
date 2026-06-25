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

export type GooSliderFieldValue = number | number[] | { min: number; max: number } | { x: number; y: number }
export type GooSliderFieldState = 'input' | 'change' | 'set'

export type GooSliderFieldEventData = {
	element: GooSliderFieldElement
	index: number
	slider: GooSliderElement | null
	state: GooSliderFieldState
	value: number
	values: number[]
	originalEvent?: Event
}

export type GooSliderFieldOptions = {
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
	onchange?: (value: GooSliderFieldValue, data: GooSliderFieldEventData) => void
	onChange?: (value: GooSliderFieldValue, data: GooSliderFieldEventData) => void
	oninput?: (value: GooSliderFieldValue, data: GooSliderFieldEventData) => void
	onInput?: (value: GooSliderFieldValue, data: GooSliderFieldEventData) => void
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
	value?: GooSliderFieldValue
	valueBubble?: GooSliderValueBubble
}

export type GooSliderFieldElement = HTMLDivElement & {
	destroy(): void
	disable(): void
	enable(): void
	getSlider(): GooSliderFieldSliderApi
	getValue(): GooSliderFieldValue
	setOptions(options: Partial<GooSliderFieldOptions>): void
	setValue(value: GooSliderFieldValue, options?: { silent?: boolean }): void
	value: GooSliderFieldValue
}

export type GooSliderFieldSliderApi = {
	element: HTMLElement
	getState(): GooSliderFieldState | 'load'
	get values(): number[]
	getValue(): GooSliderFieldValue
	setValue(value: GooSliderFieldValue, options?: { silent?: boolean }): void
	toPercent(value: number): number
}
