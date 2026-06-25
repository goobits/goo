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

type CheckboxControlElement = HTMLDivElement & {
	getValue?: () => boolean
	setValue?: (value: boolean, options?: { silent?: boolean }) => void
	toggle?: (value?: boolean) => boolean
}

export type CheckboxFieldElement = HTMLDivElement & {
	checked: boolean
	destroy(): void
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
	let checkboxElement: CheckboxControlElement | null = null
	let destroyed = false

	function unmountCheckbox(): void {
		if (instance) {
			unmount(instance)
			instance = null
		}
		checkboxElement = null
		field.replaceChildren()
	}

	function render(): void {
		if (destroyed) return

		unmountCheckbox()

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
		checkboxElement = field.querySelector('.goo-checkbox') as CheckboxControlElement | null
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
		if (destroyed) return
		currentValue = Boolean(value)
		if (checkboxElement?.setValue) {
			checkboxElement.setValue(currentValue, { silent: true })
			currentValue = checkboxElement.getValue?.() ?? currentValue
		} else {
			render()
		}
	}
	field.toggle = (value) => {
		if (destroyed) return false
		if (checkboxElement?.toggle) {
			const changed = checkboxElement.toggle(value)
			currentValue = checkboxElement.getValue?.() ?? currentValue
			return changed
		}
		const oldValue = currentValue
		const nextValue = value ?? !currentValue
		if (nextValue === oldValue) return false
		currentValue = nextValue
		render()
		options.onchange?.(currentValue, oldValue)
		return true
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountCheckbox()
		field.remove()
	}

	render()
	return field
}
