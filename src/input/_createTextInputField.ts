import { type Component, mount, unmount } from 'svelte'

import GooInput from './GooInput.svelte'
import type { GooInputProps, GooInputType } from './types.ts'

export type TextInputFieldOptions<T = string> = {
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

type MountedTextInput<T> = ReturnType<typeof mount> & {
	getValue?: () => unknown
	setValue?: (value: T, options?: { silent?: boolean }) => void
}

export type TextInputFieldElement<T = string> = HTMLDivElement & {
	destroy(): void
	getValue(): T
	setValue(value: T): void
	value: T
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
		if (options.className !== undefined) props.class = options.className
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
