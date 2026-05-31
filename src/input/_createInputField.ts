import { mount, unmount } from 'svelte'

import GooInput from './GooInput.svelte'
import GooNumber from './GooNumber.svelte'
import type { GooInputType } from './types.js'

export type TextInputFieldOptions<T = string> = {
	class?: string
	className?: string
	disabled?: boolean
	multiline?: boolean
	name?: string
	onblur?: () => void
	onchange?: (value: T, oldValue?: T) => void
	onfocus?: () => void
	oninput?: (value: T, oldValue?: T) => void
	placeholder?: string
	readonly?: boolean
	required?: boolean
	size?: string
	style?: string
	tabIndex?: number
	title?: string
	type?: GooInputType
	value?: T
}

export type NumberInputFieldOptions = Omit<TextInputFieldOptions<number>, 'multiline' | 'onchange' | 'oninput' | 'type'> & {
	max?: number
	min?: number
	onchange?: (value: number, oldValue?: number) => void
	oninput?: (value: number, oldValue?: number) => void
	step?: number | 'any'
	unit?: string
	value?: number
}

type MountedControl = ReturnType<typeof mount>

export type TextInputFieldElement<T = string> = HTMLDivElement & {
	getValue(): T
	setValue(value: T): void
	value: T
}

export type NumberInputFieldElement = HTMLDivElement & {
	getValue(): number
	setValue(value: number): void
	value: number
}

export function createInputField<T = string>(options: TextInputFieldOptions<T> = {}): TextInputFieldElement<T> {
	const field = document.createElement('div') as TextInputFieldElement<T>
	field.className = 'goo-input-field'
	let currentValue = options.value ?? ('' as T)
	let instance: MountedControl | null = null

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

		instance = mount(GooInput, {
			target: field,
			props: {
				value: currentValue,
				placeholder: options.placeholder,
				type: options.type,
				multiline: options.multiline,
				name: options.name,
				disabled: options.disabled,
				readonly: options.readonly,
				required: options.required,
				size: options.size,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				title: options.title,
				oninput: (value, oldValue) => {
					currentValue = value as T
					options.oninput?.(value as T, oldValue as T)
				},
				onchange: (value, oldValue) => {
					currentValue = value as T
					options.onchange?.(value as T, oldValue as T)
				},
				onfocus: options.onfocus,
				onblur: options.onblur
			}
		})
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: T) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue
	field.setValue = value => {
		currentValue = value
		render()
	}

	render()
	return field
}

export function createNumberField(options: NumberInputFieldOptions = {}): NumberInputFieldElement {
	const field = document.createElement('div') as NumberInputFieldElement
	field.className = 'goo-number-field'
	let currentValue = Number(options.value ?? 0)
	let instance: MountedControl | null = null

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

		instance = mount(GooNumber, {
			target: field,
			props: {
				value: currentValue,
				min: options.min,
				max: options.max,
				step: options.step,
				unit: options.unit,
				name: options.name,
				disabled: options.disabled,
				size: options.size,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				title: options.title,
				oninput: (value, oldValue) => {
					currentValue = value
					options.oninput?.(value, oldValue)
				},
				onchange: (value, oldValue) => {
					currentValue = value
					options.onchange?.(value, oldValue)
				},
				onfocus: options.onfocus,
				onblur: options.onblur
			}
		})
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: number) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue
	field.setValue = value => {
		currentValue = Number(value)
		render()
	}

	render()
	return field
}
