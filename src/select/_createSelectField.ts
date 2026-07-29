import { flushSync, mount, unmount } from 'svelte'

import { normalizeOptions } from './_normalizeOptions.ts'
import GooSelect from './GooSelect.svelte'
import type {
	GooSelectElement,
	GooSelectEventData,
	GooSelectMenuOptions,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectOptionsInput,
	GooSelectProps
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
	let needsMountFlush = false

	function unmountSelect(): void {
		if (instance) {
			unmount(instance)
			instance = null
		}
	}

	function render(): void {
		if (destroyed) return

		unmountSelect()

		const props: GooSelectProps = {
			value: currentValue,
			onchange: (value: string, data: GooSelectEventData) => {
				currentValue = value
				options.onchange?.(value, data)
			}
		}
		if (options.options !== undefined) props.options = options.options
		if (options.enableKeyboard !== undefined) props.enableKeyboard = options.enableKeyboard
		if (options.showSelectionIndicator !== undefined) {
			props.showSelectionIndicator = options.showSelectionIndicator
		}
		if (options.showHeader !== undefined) props.showHeader = options.showHeader
		if (options.menu !== undefined) props.menu = options.menu
		if (options.placeholder !== undefined) props.placeholder = options.placeholder
		if (options.tooltip !== undefined) props.tooltip = options.tooltip
		if (options.title !== undefined) props.title = options.title
		if (options.disabled !== undefined) props.disabled = options.disabled
		if (options.actionContext !== undefined) props.actionContext = options.actionContext
		if (options.triggerIcon !== undefined) props.triggerIcon = options.triggerIcon
		if (options.id !== undefined) props.id = options.id
		const className = options.class ?? options.className
		if (className !== undefined) props.class = className
		if (options.style !== undefined) props.style = options.style
		if (options.onopen !== undefined) props.onopen = options.onopen
		if (options.onclose !== undefined) props.onclose = options.onclose

		instance = mount(GooSelect, {
			target: field,
			props
		})
		needsMountFlush = true
	}

	function component(): Record<string, unknown> {
		return (instance ?? {}) as Record<string, unknown>
	}

	function ensureMounted(): void {
		if (destroyed || !needsMountFlush) return
		flushSync()
		needsMountFlush = false
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
		const setValue = component()['setValue'] as
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
		!destroyed && ((component()['isOpen'] as (() => boolean) | undefined)?.() ?? false)
	field.getHoveredOptionId = () =>
		destroyed
			? null
			: ((component()['getHoveredOptionId'] as (() => string | null) | undefined)?.() ?? null)
	field.getOptions = () =>
		destroyed
			? normalizeOptions(options.options)
			: ((component()['getOptions'] as (() => GooSelectOption[]) | undefined)?.() ??
				normalizeOptions(options.options))
	field.setOptions = nextOptions => {
		if (destroyed) return
		options.options = nextOptions
		const setOptions = component()['setOptions'] as
			| ((nextOptions: typeof options.options) => void)
			| undefined
		if (setOptions) {
			setOptions(nextOptions)
		} else {
			render()
		}
	}
	field.setTriggerIcon = icon => {
		if (destroyed) return
		if (icon === null) {
			delete options.triggerIcon
		} else {
			options.triggerIcon = icon
		}
		const setTriggerIcon = component()['setTriggerIcon'] as
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
		// Svelte 5 mounts DOM bindings on its next flush. Imperative Goo factories
		// promise a ready-to-use handle, so same-task register-and-open consumers
		// must flush that pending mount before invoking the component API.
		ensureMounted()
		return (
			(component()['open'] as ((openOptions?: GooSelectOpenOptions) => boolean) | undefined)?.(
				openOptions
			) ?? false
		)
	}
	field.updatePosition = (openOptions?: GooSelectOpenOptions) => {
		if (destroyed) return false
		return (
			(
				component()['updatePosition'] as ((openOptions?: GooSelectOpenOptions) => boolean) | undefined
			)?.(openOptions) ?? false
		)
	}
	field.close = (closeOptions = {}) => {
		if (destroyed) return
		;(component()['close'] as ((closeOptions?: { quiet?: boolean }) => void) | undefined)?.(
			closeOptions
		)
	}
	field.toggle = () => {
		if (destroyed) return
		;(component()['toggle'] as (() => void) | undefined)?.()
	}
	field.enable = () => {
		if (destroyed) return
		;(component()['enable'] as (() => void) | undefined)?.()
	}
	field.disable = () => {
		if (destroyed) return
		;(component()['disable'] as (() => void) | undefined)?.()
	}
	field.focus = () => {
		if (destroyed) return
		;(component()['focus'] as (() => void) | undefined)?.()
	}
	field.blur = () => {
		if (destroyed) return
		;(component()['blur'] as (() => void) | undefined)?.()
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
