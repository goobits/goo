import { mount, unmount } from 'svelte'

import GooButtonGroup from './GooButtonGroup.svelte'
import type { ButtonGroupOptions, GooButtonGroupLayout } from './types.ts'

export type ButtonGroupFieldOptions = {
	allowMultiple?: boolean
	allowToggle?: boolean
	class?: string
	className?: string
	disabled?: boolean
	layout?: GooButtonGroupLayout
	onchange?: (value: string | string[] | null) => void
	options?: ButtonGroupOptions
	size?: string
	style?: string
	tabIndex?: number
	value?: string | string[] | null
}

type MountedButtonGroup = ReturnType<typeof mount>

export type ButtonGroupFieldElement = HTMLDivElement & {
	getValue(): string | string[] | null
	setValue(value: string | string[] | null): void
	value: string | string[] | null
}

export function createButtonGroupField(options: ButtonGroupFieldOptions = {}): ButtonGroupFieldElement {
	const field = document.createElement('div') as ButtonGroupFieldElement
	field.className = 'goo-button-group-field'

	let selectedValue = options.value ?? null
	let instance: MountedButtonGroup | null = null

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

		instance = mount(GooButtonGroup, {
			target: field,
			props: {
				options: options.options,
				value: selectedValue,
				allowMultiple: options.allowMultiple,
				allowToggle: options.allowToggle,
				layout: options.layout,
				disabled: options.disabled,
				size: options.size,
				style: options.style,
				tabIndex: options.tabIndex,
				class: options.class ?? options.className,
				onchange: value => {
					selectedValue = value
					options.onchange?.(value)
				}
			}
		})
	}

	Object.defineProperties(field, {
		value: {
			configurable: true,
			get: () => selectedValue,
			set: (value: string | string[] | null) => {
				field.setValue(value)
			}
		}
	})
	field.getValue = () => selectedValue
	field.setValue = value => {
		selectedValue = value
		render()
	}

	render()
	return field
}
