import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'
import type { GooSliderThumb } from './sliderUtils.ts'

/** Available preset types for Goo slider track styling. */
export type GooSliderPreset = 'opacity' | 'hue' | 'saturation' | 'lightness' | 'brightness' | 'bipolar' | 'size'

/** Available shape types for Goo slider track geometry. */
export type GooSliderShape = 'default' | 'wedge' | 'wedge-left'

/** Unit types for slider values. */
export type GooSliderUnit = '%' | 'degree' | 'em' | 'float' | 'int' | 'integer' | 'number' | 'px' | 'rad' | 'radian' | 'x' | string

/** Slider direction. */
export type GooSliderDirection = 'horizontal' | 'vertical'

/** Slider value input accepted by the Svelte component. */
export type GooSliderValue = number | number[] | string | { min: number; max: number }

/** Data emitted by slider change/input events. */
export interface GooSliderEventData {

	/** Slider element that emitted the event. */
	slider: GooSliderElement

	/** Update state such as `input`, `change`, or `set`. */
	state: string

	/** Updated thumb. */
	thumb: GooSliderThumb

	/** Updated thumb index. */
	index: number

	/** Updated numeric value. */
	value: number

	/** Original browser event when available. */
	event?: Event
}

/** Props accepted by the Svelte `GooSlider` component. */
export type GooSliderProps = GooForwardedAttributes & {

	/** Current value or values. */
	value?: GooSliderValue

	/** Minimum value. */
	min?: number | string

	/** Maximum value. */
	max?: number | string

	/** Step increment. */
	step?: number | string

	/** Value unit for formatting. */
	unit?: GooSliderUnit

	/** Visible label text, also used as the accessible label fallback. */
	label?: string

	/** Accessible label for the slider when the visible label is unavailable or too terse. */
	ariaLabel?: string

	/** Tooltip title. */
	title?: string

	/** Native form field name. */
	name?: string

	/** Slider direction. */
	direction?: GooSliderDirection

	/** Preset track style. */
	preset?: GooSliderPreset

	/** Preset color for opacity sliders. */
	presetColor?: string

	/** Preset hue for saturation/lightness sliders. */
	presetHue?: number

	/** Preset saturation for lightness sliders. */
	presetSaturation?: number

	/** Track shape. */
	shape?: GooSliderShape

	/** Allow thumbs to cross. */
	canCross?: boolean

	/** Push neighboring thumbs when crossing is disabled. */
	canPush?: boolean

	/** Show coverage fill. */
	coverage?: boolean

	/** Keep a three-thumb range as `[low, base, high]` with low/high mirrored around base. */
	variance?: boolean

	/** Whether the slider is disabled. */
	disabled?: boolean

	/** Custom gradient colors for the track. */
	gradient?: string[]

	/** Extra class names. */
	class?: string

	/** Inline style string. */
	style?: string

	/** Tab index for keyboard focus. */
	tabIndex?: number

	/** Optional easing function for rendered thumb position. */
	easingFn?: (pct: number) => number

	/** Optional inverse easing function for pointer value conversion. */
	easingFnInvert?: (pct: number) => number

	/** Optional child content. */
	children?: Snippet

	/** Bound native slider element for imperative updates. */
	element?: GooSliderElement | null

	/** Change callback fired on commit. */
	onchange?: (value: number | number[], data: GooSliderEventData) => void

	/** Input callback fired while dragging. */
	oninput?: (value: number | number[], data: GooSliderEventData) => void

}

/** Native root element bound by `GooSlider` for imperative updates. */
export type GooSliderElement = HTMLDivElement & {

	/** Current value or values. */
	value: number | number[]

	/** Current values as an array. */
	values: number[]

	/** Set value or values. 	 * @param value - value.
 * @param options - options.
 */
	setValue(value: GooSliderValue, options?: { silent?: boolean }): void

	/** Get current value or values. */
	getValue(): number | number[]

	/** Update opacity preset color. 	 * @param color - color.
	 */
	setPresetColor(color: string): void

	/** Update saturation/lightness preset hue. 	 * @param hue - hue.
	 */
	setPresetHue(hue: number): void

	/** Update lightness preset saturation. 	 * @param saturation - saturation.
	 */
	setPresetSaturation(saturation: number): void

	/** Set custom track gradient colors. 	 * @param colors - colors.
	 */
	setGradient(colors: string[]): void

	/** Enable the slider. */
	enable(): void

	/** Disable the slider. */
	disable(): void
}
