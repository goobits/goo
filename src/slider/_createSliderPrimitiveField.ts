import { mount, unmount } from 'svelte'

import { getSliderProps } from './_sliderProps.ts'
import GooSlider from './GooSlider.svelte'
import type {
	GooSliderDirection,
	GooSliderElement,
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

export type SliderPrimitiveFieldOptions = {
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

export type SliderPrimitiveFieldElement = HTMLDivElement & {
	destroy(): void
	getValue(): number | number[]
	setValue(value: GooSliderValue): void
	value: number | number[]
}

export function createSliderPrimitiveField(
	options: SliderPrimitiveFieldOptions = {}
): SliderPrimitiveFieldElement {
	const field = document.createElement('div') as SliderPrimitiveFieldElement
	field.className = 'goo-slider-primitive-field'
	let currentValue: GooSliderValue = options.value ?? 50
	let instance: MountedControl | null = null
	let sliderElement: GooSliderElement | null = null
	let destroyed = false

	function unmountSlider(): void {
		if (instance) {
			unmount(instance)
			instance = null
		}
		sliderElement = null
		field.replaceChildren()
	}

	function render(): void {
		if (destroyed) return

		unmountSlider()

		instance = mount(GooSlider, {
			target: field,
			props: {
				...getSliderProps({ ...options, value: currentValue }),
				get element() {
					return sliderElement
				},
				set element(value) {
					sliderElement = value
				},
				oninput: (value: number | number[], data: GooSliderEventData) => {
					currentValue = value
					options.oninput?.(data)
				},
				onchange: (value: number | number[], data: GooSliderEventData) => {
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
	field.setValue = (value) => {
		if (destroyed) return
		currentValue = value
		sliderElement?.setValue(value, { silent: true })
		currentValue = sliderElement?.getValue() ?? currentValue
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountSlider()
		field.remove()
	}

	render()
	return field
}
