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
	class?: string
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
	variance?: boolean
}

export type SliderPropsDefaults = {
	max?: number
	min?: number
	step?: number
	value?: GooSliderValue
}

export function getSliderProps(options: SliderPropsOptions, defaults: SliderPropsDefaults = {}): Partial<GooSliderProps> {
	return {
		value: options.value ?? defaults.value,
		min: options.min ?? defaults.min,
		max: options.max ?? defaults.max,
		step: options.step ?? defaults.step,
		unit: options.unit,
		label: options.label,
		title: options.title,
		name: options.name,
		direction: options.direction,
		mode: options.mode,
		preset: options.preset,
		presetColor: options.presetColor,
		presetHue: options.presetHue,
		presetSaturation: options.presetSaturation,
		shape: options.shape,
		canCross: options.canCross,
		canPush: options.canPush,
		coverage: options.coverage,
		variance: options.variance,
		ticks: options.ticks,
		marks: options.marks,
		snap: options.snap,
		scale: options.scale,
		scalePower: options.scalePower,
		minDistance: options.minDistance,
		maxDistance: options.maxDistance,
		valueBubble: options.valueBubble,
		disabled: options.disabled,
		gradient: options.gradient,
		class: options.class ?? options.className,
		style: options.style,
		tabIndex: options.tabIndex,
		easingFn: options.easingFn,
		easingFnInvert: options.easingFnInvert
	}
}
