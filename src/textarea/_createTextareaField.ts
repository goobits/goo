import { mount, unmount } from 'svelte'

import GooTextarea from './GooTextarea.svelte'

export type TextareaFieldOptions = {
	class?: string
	className?: string
	cols?: number
	disabled?: boolean
	maxLength?: number
	minLength?: number
	name?: string
	onchange?: (value: string, oldValue?: string) => void
	oninput?: (value: string, oldValue?: string) => void
	placeholder?: string
	readonly?: boolean
	required?: boolean
	rows?: number
	style?: string
	tabIndex?: number
	title?: string
	value?: string
}

type MountedTextarea = ReturnType<typeof mount> & {
	getValue?: () => string
	setValue?: (value: string, options?: { silent?: boolean }) => void
}

export type TextareaFieldElement = HTMLDivElement & {
	destroy(): void
	getValue(): string
	setValue(value: string): void
	value: string
}

export function createTextareaField(options: TextareaFieldOptions = {}): TextareaFieldElement {
	const field = document.createElement('div') as TextareaFieldElement
	field.className = 'goo-textarea-field'

	let currentValue = String(options.value ?? '')
	let instance: MountedTextarea | null = null
	let destroyed = false

	function unmountTextarea(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
	}

	function render(): void {
		if (destroyed) return

		unmountTextarea()

		instance = mount(GooTextarea, {
			target: field,
			props: {
				value: currentValue,
				placeholder: options.placeholder,
				name: options.name,
				rows: options.rows,
				cols: options.cols,
				minLength: options.minLength,
				maxLength: options.maxLength,
				disabled: options.disabled,
				readonly: options.readonly,
				required: options.required,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				title: options.title,
				oninput: (value: string, oldValue?: string) => {
					currentValue = value
					options.oninput?.(value, oldValue)
				},
				onchange: (value: string, oldValue?: string) => {
					currentValue = value
					options.onchange?.(value, oldValue)
				}
			}
		})
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: string) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue
	field.setValue = value => {
		if (destroyed) return
		currentValue = String(value)
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
		unmountTextarea()
		field.remove()
	}

	render()
	return field
}
