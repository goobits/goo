import { mount, unmount } from 'svelte'

import GooCheckbox from './GooCheckbox.svelte'

export type CheckboxFieldOptions = {
	checked?: boolean
	class?: string
	className?: string
	disabled?: boolean
	formValue?: string
	label?: string
	name?: string
	onchange?: (value: boolean, oldValue?: boolean) => void
	style?: string
	tabIndex?: number
	title?: string
	value?: boolean
}

type MountedCheckbox = ReturnType<typeof mount>

export type CheckboxFieldElement = HTMLDivElement & {
	checked: boolean
	getValue(): boolean
	setValue(value: boolean): void
	toggle(value?: boolean): boolean
	value: boolean
}

export function createCheckboxField(options: CheckboxFieldOptions = {}): CheckboxFieldElement {
	const field = document.createElement('div') as CheckboxFieldElement
	field.className = 'goo-checkbox-field'

	let currentValue = Boolean(options.checked ?? options.value ?? false)
	let instance: MountedCheckbox | null = null

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

		instance = mount(GooCheckbox, {
			target: field,
			props: {
				checked: currentValue,
				disabled: options.disabled,
				formValue: options.formValue,
				label: options.label,
				name: options.name,
				style: options.style,
				tabIndex: options.tabIndex,
				title: options.title,
				class: options.class ?? options.className,
				onchange: (value: boolean, oldValue?: boolean) => {
					currentValue = value
					options.onchange?.(value, oldValue)
				}
			}
		})
	}

	Object.defineProperties(field, {
		checked: {
			configurable: true,
			get: () => currentValue,
			set: (value: boolean) => {
				field.setValue(value)
			}
		},
		value: {
			configurable: true,
			get: () => currentValue,
			set: (value: boolean) => {
				field.setValue(value)
			}
		}
	})
	field.getValue = () => currentValue
	field.setValue = (value) => {
		currentValue = Boolean(value)
		render()
	}
	field.toggle = (value) => {
		const oldValue = currentValue
		const nextValue = value ?? !currentValue
		if (nextValue === oldValue) return false
		currentValue = nextValue
		render()
		options.onchange?.(currentValue, oldValue)
		return true
	}

	render()
	return field
}
