import { mount, unmount } from 'svelte'

import GooCheckbox from './GooCheckbox.svelte'
import type { GooCheckboxProps } from './types.ts'

export type CheckboxFieldOptions = {
	ariaLabel?: string
	checked?: boolean
	className?: string
	disabled?: boolean
	formValue?: string
	label?: string
	name?: string
	onchange?: (value: boolean, oldValue?: boolean) => void
	style?: string
	tabIndex?: number
	title?: string
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
}

export function createCheckboxField(options: CheckboxFieldOptions = {}): CheckboxFieldElement {
	const field = document.createElement('div') as CheckboxFieldElement
	field.className = 'goo-checkbox-field'

	let currentValue = Boolean(options.checked ?? false)
	let instance: MountedCheckbox | null = null
	let checkboxElement: CheckboxControlElement | null = null
	let destroyed = false

	function unmountCheckbox(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
		checkboxElement = null
	}

	function render(): void {
		if (destroyed) return

		unmountCheckbox()

		const props: GooCheckboxProps = {
			checked: currentValue,
			onchange: (value: boolean, oldValue?: boolean) => {
				currentValue = value
				options.onchange?.(value, oldValue)
			}
		}
		if (options.ariaLabel !== undefined) props.ariaLabel = options.ariaLabel
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.formValue !== undefined) props.formValue = options.formValue
		if (options.label !== undefined) props.label = options.label
		if (options.name !== undefined) props.name = options.name
		if (options.style !== undefined) props.style = options.style
		if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
		if (options.title !== undefined) props.title = options.title
		if (options.className !== undefined) props.class = options.className

		instance = mount(GooCheckbox, { target: field, props })
		checkboxElement = field.querySelector('.goo-checkbox') as CheckboxControlElement | null
	}

	Object.defineProperties(field, {
		checked: {
			configurable: true,
			get: () => currentValue,
			set: (value: boolean) => {
				field.setValue(value)
			}
		}
	})
	field.getValue = () => currentValue
	field.setValue = value => {
		if (destroyed) return
		currentValue = Boolean(value)
		if (checkboxElement?.setValue) {
			checkboxElement.setValue(currentValue, { silent: true })
			currentValue = checkboxElement.getValue?.() ?? currentValue
		} else {
			render()
		}
	}
	field.toggle = value => {
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
