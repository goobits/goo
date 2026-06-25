import { mount, unmount } from 'svelte'

import { normalizeOptions } from './_normalizeOptions.ts'
import GooSelect from './GooSelect.svelte'
import type {
	GooSelectElement,
	GooSelectEventData,
	GooSelectMenuOptions,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectOptionsInput
} from './types.ts'

export type SelectFieldOptions = {
	actionContext?: unknown
	class?: string
	className?: string
	disabled?: boolean
	enableKeyboard?: boolean
	showSelectionIndicator?: boolean
	id?: string
	onchange?: (id: string, data: GooSelectEventData) => void
	onclose?: () => void
	onopen?: () => void
	options?: GooSelectOptionsInput
	placeholder?: string
	menu?: GooSelectMenuOptions
	showHeader?: boolean
	style?: string
	title?: string
	tooltip?: string | (() => string)
	triggerIcon?: string | HTMLElement | (() => HTMLElement)
	value?: string
}

type MountedControl = ReturnType<typeof mount>

export function createSelectField(options: SelectFieldOptions = {}): GooSelectElement {
	const field = document.createElement('div') as GooSelectElement
	field.className = 'goo-select-field'
	let currentValue = options.value ?? ''
	let instance: MountedControl | null = null
	let destroyed = false

	function unmountSelect(): void {
		if (instance) {
			unmount(instance)
			instance = null
		}
		field.replaceChildren()
	}

	function render(): void {
		if (destroyed) return

		unmountSelect()

		instance = mount(GooSelect, {
			target: field,
			props: {
				value: currentValue,
				options: options.options,
				enableKeyboard: options.enableKeyboard,
				showSelectionIndicator: options.showSelectionIndicator,
				showHeader: options.showHeader,
				menu: options.menu,
				placeholder: options.placeholder,
				tooltip: options.tooltip,
				title: options.title,
				disabled: options.disabled,
				actionContext: options.actionContext,
				triggerIcon: options.triggerIcon,
				id: options.id,
				class: options.class ?? options.className,
				style: options.style,
				onchange: (value: string, data: GooSelectEventData) => {
					currentValue = value
					options.onchange?.(value, data)
				},
				onopen: options.onopen,
				onclose: options.onclose
			}
		})
	}

	function component(): Record<string, unknown> {
		return (instance ?? {}) as Record<string, unknown>
	}

	Object.defineProperty(field, 'value', {
		configurable: true,
		get: () => currentValue,
		set: (value: string) => {
			field.setValue(String(value), { silent: true })
		}
	})

	field.setValue = (value, { silent = false } = {}) => {
		if (destroyed) return
		currentValue = value
		const setValue = component().setValue as
			| ((value: string, opts?: { silent?: boolean }) => void)
			| undefined
		if (setValue) {
			setValue(value, { silent })
		} else {
			render()
		}
	}
	field.getValue = () => currentValue
	field.isOpen = () =>
		!destroyed && ((component().isOpen as (() => boolean) | undefined)?.() ?? false)
	field.getHoveredOptionId = () =>
		destroyed
			? null
			: ((component().getHoveredOptionId as (() => string | null) | undefined)?.() ?? null)
	field.getOptions = () =>
		destroyed
			? normalizeOptions(options.options)
			: ((component().getOptions as (() => GooSelectOption[]) | undefined)?.() ??
				normalizeOptions(options.options))
	field.setOptions = (nextOptions) => {
		if (destroyed) return
		options.options = nextOptions
		const setOptions = component().setOptions as
			| ((nextOptions: typeof options.options) => void)
			| undefined
		if (setOptions) {
			setOptions(nextOptions)
		} else {
			render()
		}
	}
	field.setTriggerIcon = (icon) => {
		if (destroyed) return
		options.triggerIcon = icon ?? undefined
		const setTriggerIcon = component().setTriggerIcon as
			| ((icon: typeof options.triggerIcon | null) => void)
			| undefined
		if (setTriggerIcon) {
			setTriggerIcon(icon)
		} else {
			render()
		}
	}
	field.open = (openOptions?: GooSelectOpenOptions) => {
		if (destroyed) return false
		return (
			(component().open as ((openOptions?: GooSelectOpenOptions) => boolean) | undefined)?.(
				openOptions
			) ?? false
		)
	}
	field.updatePosition = (openOptions?: GooSelectOpenOptions) => {
		if (destroyed) return false
		return (
			(
				component().updatePosition as ((openOptions?: GooSelectOpenOptions) => boolean) | undefined
			)?.(openOptions) ?? false
		)
	}
	field.close = (closeOptions = {}) => {
		if (destroyed) return
		;(component().close as ((closeOptions?: { quiet?: boolean }) => void) | undefined)?.(
			closeOptions
		)
	}
	field.toggle = () => {
		if (destroyed) return
		;(component().toggle as (() => void) | undefined)?.()
	}
	field.enable = () => {
		if (destroyed) return
		;(component().enable as (() => void) | undefined)?.()
	}
	field.disable = () => {
		if (destroyed) return
		;(component().disable as (() => void) | undefined)?.()
	}
	field.focus = () => {
		if (destroyed) return
		;(component().focus as (() => void) | undefined)?.()
	}
	field.blur = () => {
		if (destroyed) return
		;(component().blur as (() => void) | undefined)?.()
	}
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmountSelect()
		field.remove()
	}

	render()
	return field
}
