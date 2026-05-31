import { mount, unmount } from 'svelte'

import GooSlider from './GooSlider.svelte'
import type {
	GooSliderDirection,
	GooSliderEventData,
	GooSliderPreset,
	GooSliderShape,
	GooSliderUnit,
	GooSliderValue
} from './types.ts'

export type SliderFieldOptions = {
	canCross?: boolean
	canPush?: boolean
	class?: string
	className?: string
	coverage?: boolean
	direction?: GooSliderDirection
	disabled?: boolean
	gradient?: string[]
	label?: string
	max?: number
	min?: number
	name?: string
	onchange?: (data: GooSliderEventData) => void
	oninput?: (data: GooSliderEventData) => void
	preset?: GooSliderPreset
	presetColor?: string
	presetHue?: number
	presetSaturation?: number
	shape?: GooSliderShape
	step?: number
	style?: string
	tabIndex?: number
	title?: string
	unit?: GooSliderUnit
	value?: GooSliderValue
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
				preset: options.preset,
				presetColor: options.presetColor,
				presetHue: options.presetHue,
				presetSaturation: options.presetSaturation,
				shape: options.shape,
				canCross: options.canCross,
				canPush: options.canPush,
				coverage: options.coverage,
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
