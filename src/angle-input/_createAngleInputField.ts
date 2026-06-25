import { mount, unmount } from 'svelte'

import GooAngleInput from './GooAngleInput.svelte'
import type { GooAngleInputElement, GooAngleInputEventData, GooAngleInputUnit } from './types.ts'

export type AngleInputFieldOptions = {
	class?: string
	className?: string
	disabled?: boolean
	id?: string
	name?: string
	onchange?: (data: GooAngleInputEventData) => void
	oninput?: (data: GooAngleInputEventData) => void
	style?: string
	tabIndex?: number
	title?: string
	unit?: GooAngleInputUnit
	value?: number | string
}

type MountedControl = ReturnType<typeof mount>

export type AngleInputFieldElement = HTMLDivElement & {
	destroy(): void
	getValue(): number
	setValue(value: number | string): void
	value: number
}

export function createAngleInputField(
	options: AngleInputFieldOptions = {}
): AngleInputFieldElement {
	const field = document.createElement('div') as AngleInputFieldElement
	field.className = 'goo-angle-input-field'
	let currentValue = parseAngleValue(options.value)
	let instance: MountedControl | null = null
	let angleElement: GooAngleInputElement | null = null
	let destroyed = false

	function unmountAngleInput(): void {
		if (instance) {
			unmount(instance)
			instance = null
		}
		angleElement = null
		field.replaceChildren()
	}

	function render(): void {
		if (destroyed) return

		unmountAngleInput()

		instance = mount(GooAngleInput, {
			target: field,
			props: {
				value: currentValue,
				get element() {
					return angleElement
				},
				set element(value) {
					angleElement = value
				},
				unit: options.unit,
				name: options.name,
				id: options.id,
				title: options.title,
				disabled: options.disabled,
				class: options.class ?? options.className,
				style: options.style,
				tabIndex: options.tabIndex,
				oninput: (value: number, data: GooAngleInputEventData) => {
					currentValue = value
					options.oninput?.(data)
				},
				onchange: (value: number, data: GooAngleInputEventData) => {
					currentValue = value
					options.onchange?.(data)
				}
			}
		})
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: number | string) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue
	field.setValue = (value) => {
		if (destroyed) return
		currentValue = parseAngleValue(value)
		if (angleElement?.setValue) {
			angleElement.setValue(currentValue, { silent: true })
			currentValue = angleElement.getValue()
		} else {
			render()
		}
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountAngleInput()
		field.remove()
	}

	render()
	return field
}

function parseAngleValue(value: number | string | undefined): number {
	const parsed = Number.parseFloat(String(value ?? 0))
	return Number.isFinite(parsed) ? parsed : 0
}
