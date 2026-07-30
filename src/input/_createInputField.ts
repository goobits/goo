import { type Component, mount, unmount } from 'svelte'

import GooInput from './GooInput.svelte'
import GooNumber from './GooNumber.svelte'
import type { GooInputProps, GooInputType, GooNumberProps } from './types.ts'

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

export type NumberInputFieldOptions = Omit<
	TextInputFieldOptions<number>,
	'multiline' | 'onchange' | 'oninput' | 'type'
> & {
	auto?: boolean
	autoLabel?: string
	max?: number
	min?: number
	onautotoggle?: (auto: boolean) => void
	onchange?: (value: number, oldValue?: number) => void
	oninput?: (value: number, oldValue?: number) => void
	step?: number | 'any'
	unit?: string
	value?: number
}

type MountedTextInput<T> = ReturnType<typeof mount> & {
	getValue?: () => unknown
	setValue?: (value: T, options?: { silent?: boolean }) => void
}

type MountedNumberInput = ReturnType<typeof mount> & {
	getValue?: () => number
	setAuto?: (auto: boolean) => void
	setValue?: (value: number, options?: { silent?: boolean }) => void
}

export type TextInputFieldElement<T = string> = HTMLDivElement & {
	destroy(): void
	getValue(): T
	setValue(value: T): void
	value: T
}

export type NumberInputFieldElement = HTMLDivElement & {
	destroy(): void
	getValue(): number
	setAuto(auto: boolean): void
	setValue(value: number): void
	value: number
}

export function createInputField<T = string>(
	options: TextInputFieldOptions<T> = {}
): TextInputFieldElement<T> {
	const field = document.createElement('div') as TextInputFieldElement<T>
	field.className = 'goo-input-field'
	let currentValue = options.value ?? ('' as T)
	let instance: MountedTextInput<T> | null = null
	let destroyed = false

	function unmountInput(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
	}

	function render(): void {
		if (destroyed) return

		unmountInput()

		const props: GooInputProps<T> = {
			value: currentValue,
			oninput: (value: T, oldValue?: T) => {
				currentValue = value
				options.oninput?.(value, oldValue)
			},
			onchange: (value: T, oldValue?: T) => {
				currentValue = value
				options.onchange?.(value, oldValue)
			}
		}
		if (options.placeholder !== undefined) props.placeholder = options.placeholder
		if (options.type !== undefined) props.type = options.type
		if (options.multiline !== undefined) props.multiline = options.multiline
		if (options.name !== undefined) props.name = options.name
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.readonly !== undefined) props.readonly = options.readonly
		if (options.required !== undefined) props.required = options.required
		if (options.size !== undefined) props.size = options.size
		const className = options.class ?? options.className
		if (className !== undefined) props.class = className
		if (options.style !== undefined) props.style = options.style
		if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
		if (options.title !== undefined) props.title = options.title
		if (options.onfocus !== undefined) props.onfocus = options.onfocus
		if (options.onblur !== undefined) props.onblur = options.onblur

		const InputComponent = GooInput as Component<GooInputProps<T>, MountedTextInput<T>>
		instance = mount(InputComponent, { target: field, props })
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
		if (destroyed) return
		currentValue = value
		if (instance?.setValue) {
			instance.setValue(value, { silent: true })
			currentValue = (instance.getValue?.() ?? currentValue) as T
		} else {
			render()
		}
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountInput()
		field.remove()
	}

	render()
	return field
}

export function createNumberField(options: NumberInputFieldOptions = {}): NumberInputFieldElement {
	const field = document.createElement('div') as NumberInputFieldElement
	field.className = 'goo-number-field'
	let currentValue = Number(options.value ?? 0)
	let currentAuto = Boolean(options.auto)
	let instance: MountedNumberInput | null = null
	let destroyed = false

	function unmountNumber(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
	}

	function render(): void {
		if (destroyed) return

		unmountNumber()

		const props: GooNumberProps = {
			value: currentValue,
			auto: currentAuto,
			oninput: (value: number, oldValue?: number) => {
				currentValue = value
				options.oninput?.(value, oldValue)
			},
			onchange: (value: number, oldValue?: number) => {
				currentValue = value
				options.onchange?.(value, oldValue)
			}
		}
		if (options.min !== undefined) props.min = options.min
		if (options.max !== undefined) props.max = options.max
		if (options.step !== undefined) props.step = options.step
		if (options.unit !== undefined) props.unit = options.unit
		if (options.autoLabel !== undefined) props.autoLabel = options.autoLabel
		if (options.onautotoggle !== undefined) props.onautotoggle = options.onautotoggle
		if (options.name !== undefined) props.name = options.name
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.size !== undefined) props.size = options.size
		const className = options.class ?? options.className
		if (className !== undefined) props.class = className
		if (options.style !== undefined) props.style = options.style
		if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
		if (options.title !== undefined) props.title = options.title
		if (options.onfocus !== undefined) props.onfocus = options.onfocus
		if (options.onblur !== undefined) props.onblur = options.onblur

		instance = mount(GooNumber, { target: field, props })
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: number) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue
	field.setAuto = auto => {
		if (destroyed || currentAuto === Boolean(auto)) return
		currentAuto = Boolean(auto)
		// In-place update: a remount would destroy a focused value input
		// mid-interaction (click-to-edit clears Auto, then types).
		if (instance?.setAuto) {
			instance.setAuto(currentAuto)
		} else {
			render()
		}
	}
	field.setValue = value => {
		if (destroyed) return
		currentValue = Number(value)
		if (instance?.setValue) {
			instance.setValue(currentValue, { silent: true })
			currentValue = instance.getValue?.() ?? currentValue
		} else {
			render()
		}
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountNumber()
		field.remove()
	}

	render()
	return field
}
