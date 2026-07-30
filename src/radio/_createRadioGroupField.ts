import { mount, unmount } from 'svelte'

import GooRadioGroup from './GooRadioGroup.svelte'
import type { GooRadioGroupLayout, GooRadioGroupProps, GooRadioOptions } from './types.ts'

export type RadioGroupFieldOptions = {
	class?: string
	className?: string
	disabled?: boolean
	layout?: GooRadioGroupLayout
	name?: string
	onchange?: (value: string, oldValue?: string) => void
	options?: GooRadioOptions
	required?: boolean
	style?: string
	tabIndex?: number
	title?: string
	value?: string
}

type MountedRadioGroup = ReturnType<typeof mount>

type RadioGroupControlElement = HTMLDivElement & {
	getValue?: () => string
	setValue?: (value: string, options?: { silent?: boolean }) => void
}

export type RadioGroupFieldElement = HTMLDivElement & {
	destroy(): void
	getValue(): string
	setValue(value: string): void
	value: string
}

export function createRadioGroupField(
	options: RadioGroupFieldOptions = {}
): RadioGroupFieldElement {
	const field = document.createElement('div') as RadioGroupFieldElement
	field.className = 'goo-radio-group-field'

	let currentValue = String(options.value ?? '')
	let instance: MountedRadioGroup | null = null
	let radioElement: RadioGroupControlElement | null = null
	let destroyed = false

	function unmountRadioGroup(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
		radioElement = null
	}

	function render(): void {
		if (destroyed) return

		unmountRadioGroup()

		const props: GooRadioGroupProps = {
			value: currentValue,
			onchange: (value: string, oldValue?: string) => {
				currentValue = value
				options.onchange?.(value, oldValue)
			}
		}
		if (options.options !== undefined) props.options = options.options
		if (options.name !== undefined) props.name = options.name
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.required !== undefined) props.required = options.required
		if (options.layout !== undefined) props.layout = options.layout
		const className = options.class ?? options.className
		if (className !== undefined) props.class = className
		if (options.style !== undefined) props.style = options.style
		if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
		if (options.title !== undefined) props.title = options.title

		instance = mount(GooRadioGroup, { target: field, props })
		radioElement = field.querySelector('.goo-radio-group') as RadioGroupControlElement | null
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
		if (radioElement?.setValue) {
			radioElement.setValue(currentValue, { silent: true })
			currentValue = radioElement.getValue?.() ?? currentValue
		} else {
			render()
		}
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountRadioGroup()
		field.remove()
	}

	render()
	return field
}
