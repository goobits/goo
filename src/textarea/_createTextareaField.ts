import { mount, unmount } from 'svelte'

import GooTextarea from './GooTextarea.svelte'
import type { GooTextareaProps } from './types.ts'

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

		const props: GooTextareaProps = {
			value: currentValue,
			oninput: (value: string, oldValue?: string) => {
				currentValue = value
				options.oninput?.(value, oldValue)
			},
			onchange: (value: string, oldValue?: string) => {
				currentValue = value
				options.onchange?.(value, oldValue)
			}
		}
		if (options.placeholder !== undefined) props.placeholder = options.placeholder
		if (options.name !== undefined) props.name = options.name
		if (options.rows !== undefined) props.rows = options.rows
		if (options.cols !== undefined) props.cols = options.cols
		if (options.minLength !== undefined) props.minLength = options.minLength
		if (options.maxLength !== undefined) props.maxLength = options.maxLength
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.readonly !== undefined) props.readonly = options.readonly
		if (options.required !== undefined) props.required = options.required
		const className = options.class ?? options.className
		if (className !== undefined) props.class = className
		if (options.style !== undefined) props.style = options.style
		if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
		if (options.title !== undefined) props.title = options.title

		instance = mount(GooTextarea, { target: field, props })
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
