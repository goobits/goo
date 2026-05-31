import { mount, unmount } from 'svelte'

import GooSelect from './GooSelect.svelte'
import type { GooSelectElement, GooSelectEventData, GooSelectMenuOptions, GooSelectOpenOptions, GooSelectOption } from './types.js'

export type SelectFieldOptions = {
	boundContext?: unknown
	class?: string
	className?: string
	disabled?: boolean
	enableKeyboard?: boolean
	enableSelection?: boolean
	id?: string
	onchange?: (id: string, data: GooSelectEventData) => void
	onclose?: () => void
	onopen?: () => void
	options?: readonly string[] | readonly GooSelectOption[] | Record<string, unknown>
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
				enableSelection: options.enableSelection,
				showHeader: options.showHeader,
				menu: options.menu,
				placeholder: options.placeholder,
				tooltip: options.tooltip,
				title: options.title,
				disabled: options.disabled,
				boundContext: options.boundContext,
				triggerIcon: options.triggerIcon,
				id: options.id,
				class: options.class ?? options.className,
				style: options.style,
				onchange: (value, data) => {
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

	Object.defineProperties(field, {
		value: {
			configurable: true,
			get: () => currentValue,
			set: (value: string) => {
				field.setValue(String(value), { silent: true })
			}
		},
		opened: {
			configurable: true,
			get: () => Boolean(field.querySelector('.goo-select--open'))
		}
	})

	field.setValue = (value, { silent = false } = {}) => {
		currentValue = value
		;(component().setValue as ((value: string, opts?: { silent?: boolean }) => void) | undefined)?.(value, { silent })
	}
	field.getValue = () => currentValue
	field.setOptions = nextOptions => {
		options.options = nextOptions
		;(component().setOptions as ((nextOptions: typeof options.options) => void) | undefined)?.(nextOptions)
	}
	field.setTriggerIcon = icon => {
		options.triggerIcon = icon ?? undefined
		;(component().setTriggerIcon as ((icon: typeof options.triggerIcon | null) => void) | undefined)?.(icon)
	}
	field.open = (openOptions?: GooSelectOpenOptions) => {
		return (component().open as ((openOptions?: GooSelectOpenOptions) => boolean) | undefined)?.(openOptions) ?? false
	}
	field.close = (closeOptions = {}) => {
		;(component().close as ((closeOptions?: { quiet?: boolean }) => void) | undefined)?.(closeOptions)
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
	field.setBoundContext = context => {
		options.boundContext = context
		;(component().setBoundContext as ((context: unknown) => void) | undefined)?.(context)
	}

	render()
	return field
}
