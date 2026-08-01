import type {
	GooSliderDirection,
	GooSliderMark,
	GooSliderMode,
	GooSliderPreset,
	GooSliderProps,
	GooSliderScale,
	GooSliderShape,
	GooSliderSnap,
	GooSliderTickConfig,
	GooSliderUnit,
	GooSliderValue,
	GooSliderValueBubble
} from './types.ts'

export type SliderPropsOptions = {
	canCross?: boolean
	canPush?: boolean
	className?: string
	coverage?: boolean
	direction?: GooSliderDirection
	disabled?: boolean
	easingFn?: (pct: number) => number
	easingFnInvert?: (pct: number) => number
	gradient?: string[]
	label?: string
	marks?: GooSliderMark[]
	max?: number
	maxDistance?: number | string
	min?: number
	minDistance?: number | string
	mode?: GooSliderMode
	name?: string
	preset?: GooSliderPreset
	presetColor?: string
	presetHue?: number
	presetSaturation?: number
	resetValue?: GooSliderValue
	scale?: GooSliderScale
	scalePower?: number
	shape?: GooSliderShape
	snap?: GooSliderSnap
	step?: number
	style?: string
	tabIndex?: number
	ticks?: GooSliderTickConfig
	title?: string
	unit?: GooSliderUnit
	value?: GooSliderValue
	valueBubble?: GooSliderValueBubble
}

export type SliderPropsDefaults = {
	max?: number
	min?: number
	step?: number
	value?: GooSliderValue
}

export function getSliderProps(options: SliderPropsOptions, defaults: SliderPropsDefaults = {}): Partial<GooSliderProps> {
	const props: Partial<GooSliderProps> = {}
	const value = options.value ?? defaults.value
	const min = options.min ?? defaults.min
	const max = options.max ?? defaults.max
	const step = options.step ?? defaults.step
	const className = options.className
	if (value !== undefined) props.value = value
	if (min !== undefined) props.min = min
	if (max !== undefined) props.max = max
	if (step !== undefined) props.step = step
	if (options.unit !== undefined) props.unit = options.unit
	if (options.label !== undefined) props.label = options.label
	if (options.title !== undefined) props.title = options.title
	if (options.name !== undefined) props.name = options.name
	if (options.direction !== undefined) props.direction = options.direction
	if (options.mode !== undefined) props.mode = options.mode
	if (options.preset !== undefined) props.preset = options.preset
	if (options.presetColor !== undefined) props.presetColor = options.presetColor
	if (options.presetHue !== undefined) props.presetHue = options.presetHue
	if (options.presetSaturation !== undefined) props.presetSaturation = options.presetSaturation
	if (options.shape !== undefined) props.shape = options.shape
	if (options.canCross !== undefined) props.canCross = options.canCross
	if (options.canPush !== undefined) props.canPush = options.canPush
	if (options.coverage !== undefined) props.coverage = options.coverage
	if (options.ticks !== undefined) props.ticks = options.ticks
	if (options.marks !== undefined) props.marks = options.marks
	if (options.snap !== undefined) props.snap = options.snap
	if (options.resetValue !== undefined) props.resetValue = options.resetValue
	if (options.scale !== undefined) props.scale = options.scale
	if (options.scalePower !== undefined) props.scalePower = options.scalePower
	if (options.minDistance !== undefined) props.minDistance = options.minDistance
	if (options.maxDistance !== undefined) props.maxDistance = options.maxDistance
	if (options.valueBubble !== undefined) props.valueBubble = options.valueBubble
	if (options.disabled !== undefined) props.disabled = options.disabled
	if (options.gradient !== undefined) props.gradient = options.gradient
	if (className !== undefined) props.class = className
	if (options.style !== undefined) props.style = options.style
	if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
	if (options.easingFn !== undefined) props.easingFn = options.easingFn
	if (options.easingFnInvert !== undefined) props.easingFnInvert = options.easingFnInvert
	return props
}
