import './GooRangeModule.css'

import { mount, unmount } from 'svelte'

import { createNumberField, type NumberInputFieldElement } from '../input/_createInputField.ts'
import GooSlider from '../slider/GooSlider.svelte'
import type { GooSliderElement, GooSliderEventData, GooSliderValue } from '../slider/types.ts'
import type {
	GooRangeModuleElement,
	GooRangeModuleEventData,
	GooRangeModuleOptions,
	GooRangeModuleRangeApi,
	GooRangeModuleState,
	GooRangeModuleValue
} from './types.ts'

type MountedControl = ReturnType<typeof mount>
type ValueMode = 'number' | 'array' | 'minmax' | 'xy'
type GooRangeSliderElement = GooSliderElement & {
	setAnimate(index: number, animate: boolean): void
	toPercent(value: number): number
}

const DEFAULT_MIN = 0
const DEFAULT_MAX = 100
const DEFAULT_STEP = 1

/** Creates range module field for range-module controls. */
export function createRangeModuleField(options: GooRangeModuleOptions = {}): GooRangeModuleElement {
	let currentOptions = { ...options }
	const element = document.createElement('div') as GooRangeModuleElement
	const headerHost = document.createElement('div')
	const labelHost = document.createElement('div')
	const sliderHost = document.createElement('div')
	const inputHost = document.createElement('div')
	let sliderInstance: MountedControl | null = null
	let sliderElement: GooRangeSliderElement | null = null
	let inputElements: NumberInputFieldElement[] = []
	let valueMode: ValueMode = detectValueMode(currentOptions.value)
	let currentValues = normalizeValues(currentOptions.value, currentOptions.min)
	let state: GooRangeModuleState | 'load' = 'load'

	element.className = buildRootClass(currentOptions)
	headerHost.className = 'goo-range-module__header'
	labelHost.className = 'goo-range-module__label'
	sliderHost.className = 'goo-range-module__slider'
	inputHost.className = 'goo-range-module__inputs'
	headerHost.append(labelHost, inputHost)
	element.append(headerHost, sliderHost)

	function render(): void {
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
		if (sliderInstance) {
			unmount(sliderInstance)
			sliderInstance = null
			sliderHost.replaceChildren()
		}

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
				preset: currentOptions.preset,
				presetColor: currentOptions.presetColor,
				presetHue: currentOptions.presetHue,
				presetSaturation: currentOptions.presetSaturation,
				shape: currentOptions.shape,
				canCross: currentOptions.canCross,
				canPush: currentOptions.canPush,
				coverage: currentOptions.coverage,
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
					sliderElement = value as GooRangeSliderElement | null
				},
				oninput: (_value: number | number[], data: GooSliderEventData) => {
					handleSliderEvent(data, 'input')
				},
				onchange: (_value: number | number[], data: GooSliderEventData) => {
					handleSliderEvent(data, 'change')
				}
			}
		})
		sliderElement = (boundSliderElement ?? sliderHost.querySelector('.goo-slider')) as GooRangeSliderElement | null
	}

	function renderInputs(): void {
		inputElements = []
		inputHost.replaceChildren()
		inputHost.hidden = !shouldShowInputs(currentOptions)
		if (inputHost.hidden) return

		const nextValues = getSliderValues()
		nextValues.forEach((value, index) => {
			const input = createNumberField({
				className: `goo-range-module__number goo-range-module__number--index${ index }`,
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

		inputHost.classList.toggle('goo-range-module__inputs--grouped', inputElements.length > 1)
	}

	function handleSliderEvent(data: GooSliderEventData, nextState: GooRangeModuleState): void {
		state = nextState
		currentValues = getSliderValues()
		syncInputs(data.index)
		emit(nextState, data.index, data.value, data.event)
	}

	function handleNumberInput(index: number, value: number, nextState: GooRangeModuleState): void {
		state = nextState
		const values = currentValues.slice()
		values[index] = value
		currentValues = values
		sliderElement?.setValue(toSliderValue(currentValues), { silent: true })
		emit(nextState, index, value)
	}

	function emit(nextState: GooRangeModuleState, index: number, value: number, originalEvent?: Event): void {
		const data: GooRangeModuleEventData = {
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

	function setValue(value: GooRangeModuleValue, { silent = true }: { silent?: boolean } = {}): void {
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
		set: (value: GooRangeModuleValue) => {
			setValue(value)
		}
	})

	element.getValue = () => formatValue(currentValues, valueMode)
	element.setValue = setValue
	element.setOptions = nextOptions => {
		currentOptions = { ...currentOptions, ...nextOptions }
		if (nextOptions.value !== undefined) {
			valueMode = detectValueMode(nextOptions.value)
			currentValues = normalizeValues(nextOptions.value, currentOptions.min)
		}
		render()
	}
	element.enable = () => {
		currentOptions.disabled = false
		element.classList.remove('goo-range-module--disabled')
		sliderElement?.enable?.()
	}
	element.disable = () => {
		currentOptions.disabled = true
		element.classList.add('goo-range-module--disabled')
		sliderElement?.disable?.()
	}
	element.destroy = () => {
		if (sliderInstance) {
			unmount(sliderInstance)
			sliderInstance = null
		}
		element.remove()
	}
	const rangeApi: GooRangeModuleRangeApi = {
		element: sliderHost,
		getState() {
			return state
		},
		get values() {
			return getSliderValues()
		},
		getValue: () => element.getValue(),
		setAnimate: (index, animate) => sliderElement?.setAnimate?.(index, animate),
		setValue,
		toPercent: value => sliderElement?.toPercent?.(value) ?? 0
	}
	element.getRange = () => rangeApi

	render()
	return element
}


function buildRootClass(options: GooRangeModuleOptions): string {
	const classes = [ 'goo-range-module', 'goo-range-module--goo' ]
	if (!shouldShowInputs(options)) classes.push('goo-range-module--no-inputs')
	if (options.disabled) classes.push('goo-range-module--disabled')
	return classes.join(' ')
}

function shouldShowInputs(options: GooRangeModuleOptions): boolean {
	return options.showInputs ?? options.input ?? true
}

function normalizeValues(value: GooRangeModuleValue | undefined, fallbackMin = DEFAULT_MIN): number[] {
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

function formatValue(values: number[], mode: ValueMode): GooRangeModuleValue {
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

function detectValueMode(value: GooRangeModuleValue | undefined): ValueMode {
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
