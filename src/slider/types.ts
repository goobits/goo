import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Available preset types for Goo slider track styling. */
export type GooSliderPreset = 'opacity' | 'hue' | 'saturation' | 'lightness' | 'brightness' | 'bipolar' | 'size'

/** Available shape types for Goo slider track geometry. */
export type GooSliderShape = 'default' | 'wedge' | 'wedge-left'

/** Unit types for slider values. */
export type GooSliderUnit = '%' | 'degree' | 'em' | 'float' | 'int' | 'integer' | 'number' | 'px' | 'rad' | 'radian' | 'x' | string

/** Slider direction. */
export type GooSliderDirection = 'horizontal' | 'vertical'

/** Thumb object representing a draggable slider handle. */
export type GooSliderThumb = {
	element: HTMLElement
	index: number
	left: number
	value: number
}

/** Slider semantic mode. Existing value-shape inference is preserved when omitted. */
export type GooSliderMode = 'range' | 'value' | 'variance'

/** Slider scale mapping used to convert values to track percentages. */
export type GooSliderScale = 'exponential' | 'linear' | 'log'

/** Tick/mark configuration for the slider track. */
export type GooSliderTickConfig = boolean | number

/** Slider mark config. Numeric entries are ticks; object entries can render labels. */
export type GooSliderMark = number | {
	label?: string
	value: number
}

/** Slider snap config. `true` snaps to marks/ticks; arrays snap to explicit values. */
export type GooSliderSnap = boolean | number[]

/** Value bubble visibility. */
export type GooSliderValueBubble = boolean | 'active' | 'always'

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

	/** Explicit slider mode. When omitted, the slider infers mode from `value` and `variance`. */
	mode?: GooSliderMode

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

	/** Optional ticks on the slider track. `true` renders 10 intervals. */
	ticks?: GooSliderTickConfig

	/** Optional explicit track marks. Object marks can include visible labels. */
	marks?: GooSliderMark[]

	/** Optional snapping to marks/ticks or explicit snap values. */
	snap?: GooSliderSnap

	/** First-class value-to-track scale. Custom easing props still override rendered mapping. */
	scale?: GooSliderScale

	/** Minimum allowed distance between neighboring range thumbs. */
	minDistance?: number | string

	/** Maximum allowed distance between neighboring range thumbs. */
	maxDistance?: number | string

	/** Show value bubbles on hover/focus/drag, or always when set to `'always'`. */
	valueBubble?: GooSliderValueBubble

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

	/** Current thumb handles as DOM-backed API objects. */
	thumbs: GooSliderThumb[]

	/** Set value or values.
	 * @param value - Next slider value.
	 * @param options - Update options.
	 */
	setValue(value: GooSliderValue, options?: { silent?: boolean }): void

	/** Get current value or values. */
	getValue(): number | number[]

	/** Update opacity preset color.
	 * @param color - CSS color value.
	 */
	setPresetColor(color: string): void

	/** Update saturation/lightness preset hue.
	 * @param hue - Hue value in degrees.
	 */
	setPresetHue(hue: number): void

	/** Update lightness preset saturation.
	 * @param saturation - Saturation percentage.
	 */
	setPresetSaturation(saturation: number): void

	/** Set custom track gradient colors.
	 * @param colors - CSS color stops.
	 */
	setGradient(colors: string[]): void

	/** Convert a value to its rendered track percent. */
	toPercent(value: number): number

	/** Enable the slider. */
	enable(): void

	/** Disable the slider. */
	disable(): void
}
