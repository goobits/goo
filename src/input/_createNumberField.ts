import { mount, unmount } from 'svelte'

import type { TextInputFieldOptions } from './_createTextInputField.ts'
import GooNumber from './GooNumber.svelte'
import type { GooNumberProps } from './types.ts'

export type NumberInputFieldOptions = Omit<
	TextInputFieldOptions<number>,
	'multiline' | 'onchange' | 'oninput' | 'type'
> & {
	auto?: boolean
	autoLabel?: string
	max?: number
	min?: number
	onautotoggle?: (auto: boolean) => void
	onchange?: (value: number, oldValue?: number) => void
	oninput?: (value: number, oldValue?: number) => void
	step?: number | 'any'
	unit?: string
	value?: number
}

type MountedNumberInput = ReturnType<typeof mount> & {
	getValue?: () => number
	setAuto?: (auto: boolean) => void
	setValue?: (value: number, options?: { silent?: boolean }) => void
}

export type NumberInputFieldElement = HTMLDivElement & {
	destroy(): void
	getValue(): number
	setAuto(auto: boolean): void
	setValue(value: number): void
	value: number
}

export function createNumberField(options: NumberInputFieldOptions = {}): NumberInputFieldElement {
	const field = document.createElement('div') as NumberInputFieldElement
	field.className = 'goo-number-field'
	let currentValue = Number(options.value ?? 0)
	let currentAuto = Boolean(options.auto)
	let instance: MountedNumberInput | null = null
	let destroyed = false

	function unmountNumber(): void {
		if (instance) {
			unmount(instance)
			instance = null
		} else {
			field.replaceChildren()
		}
	}

	function render(): void {
		if (destroyed) return

		unmountNumber()

		const props: GooNumberProps = {
			value: currentValue,
			auto: currentAuto,
			oninput: (value: number, oldValue?: number) => {
				currentValue = value
				options.oninput?.(value, oldValue)
			},
			onchange: (value: number, oldValue?: number) => {
				currentValue = value
				options.onchange?.(value, oldValue)
			}
		}
		if (options.min !== undefined) props.min = options.min
		if (options.max !== undefined) props.max = options.max
		if (options.step !== undefined) props.step = options.step
		if (options.unit !== undefined) props.unit = options.unit
		if (options.autoLabel !== undefined) props.autoLabel = options.autoLabel
		if (options.onautotoggle !== undefined) props.onautotoggle = options.onautotoggle
		if (options.name !== undefined) props.name = options.name
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.size !== undefined) props.size = options.size
		if (options.className !== undefined) props.class = options.className
		if (options.style !== undefined) props.style = options.style
		if (options.tabIndex !== undefined) props.tabIndex = options.tabIndex
		if (options.title !== undefined) props.title = options.title
		if (options.onfocus !== undefined) props.onfocus = options.onfocus
		if (options.onblur !== undefined) props.onblur = options.onblur

		instance = mount(GooNumber, { target: field, props })
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: number) => {
			field.setValue(value)
		}
	})
	field.getValue = () => currentValue
	field.setAuto = auto => {
		if (destroyed || currentAuto === Boolean(auto)) return
		currentAuto = Boolean(auto)
		// In-place update: a remount would destroy a focused value input
		// mid-interaction (click-to-edit clears Auto, then types).
		if (instance?.setAuto) {
			instance.setAuto(currentAuto)
		} else {
			render()
		}
	}
	field.setValue = value => {
		if (destroyed) return
		currentValue = Number(value)
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
		unmountNumber()
		field.remove()
	}

	render()
	return field
}
