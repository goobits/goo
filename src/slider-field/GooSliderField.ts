import './GooSliderField.css'

import { mount, unmount } from 'svelte'

import { createNumberField, type NumberInputFieldElement } from '../input/_createInputField.ts'
import GooSlider from '../slider/GooSlider.svelte'
import { getVarianceValues } from '../slider/sliderUtils.ts'
import type { GooSliderElement, GooSliderEventData, GooSliderValue } from '../slider/types.ts'
import type {
	GooSliderFieldElement,
	GooSliderFieldEventData,
	GooSliderFieldOptions,
	GooSliderFieldSliderApi,
	GooSliderFieldState,
	GooSliderFieldValue
} from './types.ts'

type MountedControl = ReturnType<typeof mount>
type ValueMode = 'number' | 'array' | 'minmax' | 'xy'
type GooSliderFieldSliderElement = GooSliderElement

const DEFAULT_MIN = 0
const DEFAULT_MAX = 100
const DEFAULT_STEP = 1

export function createSliderField(options: GooSliderFieldOptions = {}): GooSliderFieldElement {
	let currentOptions = { ...options }
	const element = document.createElement('div') as GooSliderFieldElement
	const headerHost = document.createElement('div')
	const labelHost = document.createElement('div')
	const sliderHost = document.createElement('div')
	const inputHost = document.createElement('div')
	let sliderInstance: MountedControl | null = null
	let sliderElement: GooSliderFieldSliderElement | null = null
	let inputElements: NumberInputFieldElement[] = []
	let valueMode: ValueMode = detectValueMode(currentOptions.value)
	let currentValues = normalizeValues(currentOptions.value, currentOptions.min)
	let state: GooSliderFieldState | 'load' = 'load'
	let destroyed = false

	element.className = buildRootClass(currentOptions)
	headerHost.className = 'goo-slider-field__header'
	labelHost.className = 'goo-slider-field__label'
	sliderHost.className = 'goo-slider-field__slider'
	inputHost.className = 'goo-slider-field__inputs'
	headerHost.append(labelHost, inputHost)
	element.append(headerHost, sliderHost)

	function render(): void {
		if (destroyed) return
		element.className = buildRootClass(currentOptions)
		renderHeader()
		renderSlider()
		renderInputs()
	}

	function renderHeader(): void {
		const label = currentOptions.label || currentOptions.title || ''
		labelHost.textContent = label
		labelHost.hidden = !label
		headerHost.hidden = !label && !shouldShowInputs(currentOptions)
	}

	function renderSlider(): void {
		unmountSlider()

		let boundSliderElement: GooSliderElement | null = null
		sliderInstance = mount(GooSlider, {
			target: sliderHost,
			props: {
				value: toSliderValue(currentValues),
				min: currentOptions.min ?? DEFAULT_MIN,
				max: currentOptions.max ?? DEFAULT_MAX,
				step: currentOptions.step ?? DEFAULT_STEP,
				unit: currentOptions.unit,
				label: currentOptions.label,
				title: currentOptions.title,
				name: currentOptions.name,
				direction: currentOptions.direction,
				mode: currentOptions.mode,
				preset: currentOptions.preset,
				presetColor: currentOptions.presetColor,
				presetHue: currentOptions.presetHue,
				presetSaturation: currentOptions.presetSaturation,
				shape: currentOptions.shape,
				canCross: currentOptions.canCross,
				canPush: currentOptions.canPush,
				coverage: currentOptions.coverage,
				variance: currentOptions.variance,
				ticks: currentOptions.ticks,
				marks: currentOptions.marks,
				snap: currentOptions.snap,
				scale: currentOptions.scale,
				minDistance: currentOptions.minDistance,
				maxDistance: currentOptions.maxDistance,
				valueBubble: currentOptions.valueBubble,
				disabled: currentOptions.disabled,
				gradient: currentOptions.gradient,
				class: currentOptions.class ?? currentOptions.className,
				style: currentOptions.style,
				tabIndex: currentOptions.tabIndex,
				easingFn: currentOptions.easingFn,
				easingFnInvert: currentOptions.easingFnInvert,
				get element() {
					return boundSliderElement
				},
				set element(value) {
					boundSliderElement = value
					sliderElement = value as GooSliderFieldSliderElement | null
				},
				oninput: (_value: number | number[], data: GooSliderEventData) => {
					handleSliderEvent(data, 'input')
				},
				onchange: (_value: number | number[], data: GooSliderEventData) => {
					handleSliderEvent(data, 'change')
				}
			}
		})
		sliderElement = (boundSliderElement ?? sliderHost.querySelector('.goo-slider')) as GooSliderFieldSliderElement | null
	}

	function unmountSlider(): void {
		if (sliderInstance) {
			unmount(sliderInstance)
			sliderInstance = null
		}
		sliderElement = null
		sliderHost.replaceChildren()
	}

	function renderInputs(): void {
		inputElements = []
		inputHost.replaceChildren()
		inputHost.hidden = !shouldShowInputs(currentOptions)
		if (inputHost.hidden) return

		const nextValues = getSliderValues()
		nextValues.forEach((value, index) => {
			const input = createNumberField({
				className: `goo-slider-field__number goo-slider-field__number--index${ index }`,
				max: currentOptions.max,
				min: currentOptions.min,
				step: currentOptions.step,
				unit: currentOptions.unit,
				value,
				oninput: nextValue => handleNumberInput(index, nextValue, 'input'),
				onchange: nextValue => handleNumberInput(index, nextValue, 'change')
			})
			inputElements.push(input)
			inputHost.appendChild(input)
		})

		inputHost.classList.toggle('goo-slider-field__inputs--grouped', inputElements.length > 1)
	}

	function handleSliderEvent(data: GooSliderEventData, nextState: GooSliderFieldState): void {
		state = nextState
		currentValues = getSliderValues()
		syncInputs(currentOptions.variance ? undefined : data.index)
		emit(nextState, data.index, data.value, data.event)
	}

	function handleNumberInput(index: number, value: number, nextState: GooSliderFieldState): void {
		state = nextState
		const previousValues = currentValues
		const values = previousValues.slice()
		values[index] = value
		currentValues = currentOptions.variance || currentOptions.mode === 'variance'
			? getVarianceValues(previousValues, index, value, {
				min: currentOptions.min ?? DEFAULT_MIN,
				max: currentOptions.max ?? DEFAULT_MAX
			})
			: values
		sliderElement?.setValue(toSliderValue(currentValues), { silent: true })
		currentValues = getSliderValues()
		syncInputs()
		emit(nextState, index, currentValues[index] ?? value)
	}

	function emit(nextState: GooSliderFieldState, index: number, value: number, originalEvent?: Event): void {
		const data: GooSliderFieldEventData = {
			element,
			index,
			originalEvent,
			slider: sliderElement,
			state: nextState,
			value,
			values: currentValues.slice()
		}
		const nextValue = formatValue(currentValues, valueMode)
		if (nextState === 'input') {
			currentOptions.oninput?.(nextValue, data)
			currentOptions.onInput?.(nextValue, data)
		} else {
			currentOptions.onchange?.(nextValue, data)
			currentOptions.onChange?.(nextValue, data)
		}
		element.dispatchEvent(new CustomEvent(nextState, {
			bubbles: true,
			detail: data
		}))
	}

	function syncInputs(activeIndex?: number): void {
		if (!inputElements.length) return
		const values = getSliderValues()
		if (activeIndex === undefined) {
			values.forEach((value, index) => inputElements[index]?.setValue(value))
			return
		}
		inputElements[activeIndex]?.setValue(values[activeIndex] ?? currentOptions.min ?? DEFAULT_MIN)
	}

	function getSliderValues(): number[] {
		if (sliderElement?.values?.length) {
			return sliderElement.values.slice()
		}
		return currentValues.slice()
	}

	function setValue(value: GooSliderFieldValue, { silent = true }: { silent?: boolean } = {}): void {
		if (destroyed) return
		valueMode = detectValueMode(value)
		currentValues = normalizeValues(value, currentOptions.min)
		state = 'set'
		sliderElement?.setValue(toSliderValue(currentValues), { silent: true })
		syncInputs()
		if (!silent) {
			emit('change', 0, currentValues[0] ?? currentOptions.min ?? DEFAULT_MIN)
		}
	}

	Object.defineProperty(element, 'value', {
		configurable: true,
		get: () => formatValue(currentValues, valueMode),
		set: (value: GooSliderFieldValue) => {
			setValue(value)
		}
	})

	element.getValue = () => formatValue(currentValues, valueMode)
	element.setValue = setValue
	element.setOptions = nextOptions => {
		if (destroyed) return
		currentOptions = { ...currentOptions, ...nextOptions }
		if (nextOptions.value !== undefined) {
			valueMode = detectValueMode(nextOptions.value)
			currentValues = normalizeValues(nextOptions.value, currentOptions.min)
		}
		render()
	}
	element.enable = () => {
		if (destroyed) return
		currentOptions.disabled = false
		element.classList.remove('goo-slider-field--disabled')
		sliderElement?.enable?.()
	}
	element.disable = () => {
		if (destroyed) return
		currentOptions.disabled = true
		element.classList.add('goo-slider-field--disabled')
		sliderElement?.disable?.()
	}
	element.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountSlider()
		inputElements = []
		inputHost.replaceChildren()
		element.remove()
	}
	const sliderApi: GooSliderFieldSliderApi = {
		element: sliderHost,
		getState() {
			return state
		},
		get values() {
			return getSliderValues()
		},
		getValue: () => element.getValue(),
		setValue,
		toPercent: value => sliderElement?.toPercent?.(value) ?? 0
	}
	element.getSlider = () => sliderApi

	render()
	return element
}


function buildRootClass(options: GooSliderFieldOptions): string {
	const classes = [ 'goo-slider-field', 'goo-slider-field--goo' ]
	if (!shouldShowInputs(options)) classes.push('goo-slider-field--no-inputs')
	if (options.disabled) classes.push('goo-slider-field--disabled')
	return classes.join(' ')
}

function shouldShowInputs(options: GooSliderFieldOptions): boolean {
	return options.showInputs ?? options.input ?? true
}

function normalizeValues(value: GooSliderFieldValue | undefined, fallbackMin = DEFAULT_MIN): number[] {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		if (isXyValue(value)) {
			return [ toFiniteNumber(value.x, fallbackMin), toFiniteNumber(value.y, fallbackMin) ]
		}
		return [ toFiniteNumber(value.min, fallbackMin), toFiniteNumber(value.max, fallbackMin) ]
	}
	if (Array.isArray(value)) {
		return value.map(nextValue => toFiniteNumber(nextValue, fallbackMin))
	}
	return [ toFiniteNumber(value, fallbackMin) ]
}

function toSliderValue(values: number[]): GooSliderValue {
	return values.length > 1 ? values.slice() : values[0] ?? DEFAULT_MIN
}

function formatValue(values: number[], mode: ValueMode): GooSliderFieldValue {
	if (mode === 'minmax') {
		return {
			min: values[0] ?? DEFAULT_MIN,
			max: values[1] ?? values[0] ?? DEFAULT_MIN
		}
	}
	if (mode === 'xy') {
		return {
			x: values[0] ?? DEFAULT_MIN,
			y: values[1] ?? values[0] ?? DEFAULT_MIN
		}
	}
	if (mode === 'array') {
		return values.slice()
	}
	return values[0] ?? DEFAULT_MIN
}

function detectValueMode(value: GooSliderFieldValue | undefined): ValueMode {
	if (Array.isArray(value)) return 'array'
	if (value && typeof value === 'object') return isXyValue(value) ? 'xy' : 'minmax'
	return 'number'
}

function isXyValue(value: object): value is { x: number; y: number } {
	return 'x' in value || 'y' in value
}

function toFiniteNumber(value: unknown, fallback: number): number {
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue : fallback
}
