import { mount, unmount } from 'svelte'

import GooColor from './GooColor.svelte'
import type { GooColorEventData } from './types.js'

export type ColorFieldOptions = {
	alpha?: boolean
	class?: string
	className?: string
	disabled?: boolean
	id?: string
	name?: string
	onchange?: (data: GooColorEventData) => void
	oninput?: (data: GooColorEventData) => void
	style?: string
	tabIndex?: number
	title?: string
	value?: string
}

type MountedControl = ReturnType<typeof mount>

export type ColorFieldElement = HTMLDivElement & {
	getValue(): string
	setValue(value: string): void
	value: string
}

export function createColorField(options: ColorFieldOptions = {}): ColorFieldElement {
	const field = document.createElement('div') as ColorFieldElement
	field.className = 'goo-color-field'
	let currentValue = options.value ?? '#000000'
	let instance: MountedControl | null = null

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

		instance = mount(GooColor, {
			target: field,
			props: {
				value: currentValue,
				alpha: options.alpha,
				name: options.name,
				id: options.id,
				title: options.title,
				disabled: options.disabled,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				oninput: (value, data) => {
					currentValue = value
					options.oninput?.(data)
				},
				onchange: (value, data) => {
					currentValue = value
					options.onchange?.(data)
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
		currentValue = value
		render()
	}

	render()
	return field
}
