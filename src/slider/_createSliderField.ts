import { mount, unmount } from 'svelte'

import GooSlider from './GooSlider.svelte'
import type {
	GooSliderDirection,
	GooSliderEventData,
	GooSliderMark,
	GooSliderMode,
	GooSliderPreset,
	GooSliderScale,
	GooSliderShape,
	GooSliderSnap,
	GooSliderTickConfig,
	GooSliderUnit,
	GooSliderValue,
	GooSliderValueBubble
} from './types.ts'

export type SliderFieldOptions = {
	canCross?: boolean
	canPush?: boolean
	class?: string
	className?: string
	coverage?: boolean
	variance?: boolean
	direction?: GooSliderDirection
	disabled?: boolean
	gradient?: string[]
	label?: string
	marks?: GooSliderMark[]
	max?: number
	maxDistance?: number | string
	min?: number
	minDistance?: number | string
	mode?: GooSliderMode
	name?: string
	onchange?: (data: GooSliderEventData) => void
	oninput?: (data: GooSliderEventData) => void
	preset?: GooSliderPreset
	presetColor?: string
	presetHue?: number
	presetSaturation?: number
	scale?: GooSliderScale
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

type MountedControl = ReturnType<typeof mount>

export type SliderFieldElement = HTMLDivElement & {
	getValue(): number | number[]
	setValue(value: GooSliderValue): void
	value: number | number[]
}

export function createSliderField(options: SliderFieldOptions = {}): SliderFieldElement {
	const field = document.createElement('div') as SliderFieldElement
	field.className = 'goo-slider-field'
	let currentValue: GooSliderValue = options.value ?? 50
	let instance: MountedControl | null = null

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

		instance = mount(GooSlider, {
			target: field,
			props: {
				value: currentValue,
				min: options.min,
				max: options.max,
				step: options.step,
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
				minDistance: options.minDistance,
				maxDistance: options.maxDistance,
				valueBubble: options.valueBubble,
				disabled: options.disabled,
				gradient: options.gradient,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				oninput: (value, data) => {
					currentValue = value
					options.oninput?.(data)
				},
				onchange: (value, data) => {
					currentValue = value
					options.onchange?.(data)
				}
			}
		})
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: GooSliderValue) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue as number | number[]
	field.setValue = value => {
		currentValue = value
		render()
	}

	render()
	return field
}
