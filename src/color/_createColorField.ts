import { mount, unmount } from 'svelte'

import GooColor from './GooColor.svelte'
import type { GooColorElement, GooColorEventData } from './types.ts'

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
	destroy(): void
	getValue(): string
	setValue(value: string): void
	value: string
}

export function createColorField(options: ColorFieldOptions = {}): ColorFieldElement {
	const field = document.createElement('div') as ColorFieldElement
	field.className = 'goo-color-field'
	let currentValue = options.value ?? '#000000'
	let instance: MountedControl | null = null
	let colorElement: GooColorElement | null = null
	let destroyed = false

	function unmountColor(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
		colorElement = null
	}

	function render(): void {
		if (destroyed) return

		unmountColor()

		instance = mount(GooColor, {
			target: field,
			props: {
				value: currentValue,
				get element() {
					return colorElement
				},
				set element(value) {
					colorElement = value
				},
				alpha: options.alpha,
				name: options.name,
				id: options.id,
				title: options.title,
				disabled: options.disabled,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				oninput: (value: string, data: GooColorEventData) => {
					currentValue = value
					options.oninput?.(data)
				},
				onchange: (value: string, data: GooColorEventData) => {
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
		if (destroyed) return
		currentValue = value
		if (colorElement?.setValue) {
			colorElement.setValue(value, { silent: true })
			currentValue = colorElement.getValue()
		} else {
			render()
		}
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountColor()
		field.remove()
	}

	render()
	return field
}
