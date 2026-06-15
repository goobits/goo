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

	function render(): void {
		if (instance) {
			unmount(instance)
			instance = null
			field.replaceChildren()
		}

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
		currentValue = value
		;(component().setValue as ((value: string, opts?: { silent?: boolean }) => void) | undefined)?.(
			value,
			{ silent }
		)
	}
	field.getValue = () => currentValue
	field.isOpen = () => (component().isOpen as (() => boolean) | undefined)?.() ?? false
	field.getHoveredOptionId = () =>
		(component().getHoveredOptionId as (() => string | null) | undefined)?.() ?? null
	field.getOptions = () =>
		(component().getOptions as (() => GooSelectOption[]) | undefined)?.() ??
		normalizeOptions(options.options)
	field.setOptions = (nextOptions) => {
		options.options = nextOptions
		;(component().setOptions as ((nextOptions: typeof options.options) => void) | undefined)?.(
			nextOptions
		)
	}
	field.setTriggerIcon = (icon) => {
		options.triggerIcon = icon ?? undefined
		;(
			component().setTriggerIcon as ((icon: typeof options.triggerIcon | null) => void) | undefined
		)?.(icon)
	}
	field.open = (openOptions?: GooSelectOpenOptions) => {
		return (
			(component().open as ((openOptions?: GooSelectOpenOptions) => boolean) | undefined)?.(
				openOptions
			) ?? false
		)
	}
	field.close = (closeOptions = {}) => {
		;(component().close as ((closeOptions?: { quiet?: boolean }) => void) | undefined)?.(
			closeOptions
		)
	}
	field.toggle = () => {
		;(component().toggle as (() => void) | undefined)?.()
	}
	field.enable = () => {
		;(component().enable as (() => void) | undefined)?.()
	}
	field.disable = () => {
		;(component().disable as (() => void) | undefined)?.()
	}
	field.focus = () => {
		;(component().focus as (() => void) | undefined)?.()
	}
	field.blur = () => {
		;(component().blur as (() => void) | undefined)?.()
	}

	render()
	return field
}
