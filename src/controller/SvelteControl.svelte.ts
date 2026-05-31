import type { Component } from 'svelte'
import { mount, unmount } from 'svelte'

/** Options passed to a Svelte control schema. */
export type ControlSchemaOptions = Record<string, unknown>

/** Svelte component type compatible with mount(). */
export type SvelteComponentType = Component<Record<string, unknown>>

/**
 * Schema that Svelte controls export to describe their controller interface.
 */
export interface SvelteControlSchema {

	/** Maps schema field options to component props. */
	propMapping?: Record<string, string>

	/** The prop name that receives the bound value. */
	valueKey?: string

	/** The callback prop for committed value changes. */
	changeKey?: string

	/** The callback prop for live input changes. */
	inputKey?: string

	/** Transform the raw value before passing it to the component. */
	transformValue?: (value: unknown, options: ControlSchemaOptions) => unknown

	/** Transform component output before passing it to controller callbacks. */
	transformOutput?: (output: unknown, options: ControlSchemaOptions) => unknown

	/** Render directly without a GooController row wrapper. */
	selfContained?: boolean
}

export interface SvelteControlHostOptions {
	component: SvelteComponentType
	schema?: SvelteControlSchema
	value: unknown
	options: ControlSchemaOptions
	onchange: (value: unknown) => void
	oninput?: (value: unknown) => void
	disabled?: boolean
	object?: Record<string, unknown>
	property?: string
}

type MountedControl = ReturnType<typeof mount>

export interface SvelteControlHost {
	readonly element: HTMLElement | null
	create(): HTMLElement
	setValue(value: unknown, options?: { silent?: boolean }): void
	setOptions(options: ControlSchemaOptions): void
	getValue(): unknown
	updateDisplay(): void
	destroy(): void
}

/**
 * Mounts a Svelte control as a GooController-compatible host.
 */
export function createSvelteControlHost(opts: SvelteControlHostOptions): SvelteControlHost {
	const {
		component,
		schema = {},
		value,
		options,
		onchange,
		oninput,
		disabled,
		object,
		property
	} = opts

	const {
		propMapping = {},
		valueKey = 'value',
		changeKey = 'onchange',
		inputKey = 'oninput',
		transformValue = (nextValue: unknown) => nextValue,
		transformOutput = (output: unknown) => output
	} = schema

	let container: HTMLElement | null = null
	let instance: MountedControl | null = null
	const componentProps = $state<Record<string, unknown>>({})
	let currentValue = value
	let currentOptions = options

	function updateValue(nextValue: unknown): void {
		currentValue = nextValue
		componentProps[valueKey] = transformValue(nextValue, currentOptions)
	}

	function resetProps(nextProps: Record<string, unknown>): void {
		for (const key of Object.keys(componentProps)) {
			delete componentProps[key]
		}
		Object.assign(componentProps, nextProps)
	}

	function buildProps(): Record<string, unknown> {
		const props: Record<string, unknown> = {
			[valueKey]: transformValue(currentValue, currentOptions),
			disabled,
			[changeKey]: (output: unknown) => {
				const nextValue = transformOutput(output, currentOptions)
				updateValue(nextValue)
				onchange(nextValue)
			}
		}

		if (oninput) {
			props[inputKey] = (output: unknown) => {
				const nextValue = transformOutput(output, currentOptions)
				updateValue(nextValue)
				oninput(nextValue)
			}
		}

		for (const [ schemaKey, propKey ] of Object.entries(propMapping)) {
			if (currentOptions[schemaKey] !== undefined) {
				props[propKey] = currentOptions[schemaKey]
			}
		}

		return props
	}

	const host: SvelteControlHost = {
		get element() {
			return container
		},

		create() {
			container = document.createElement('div')
			container.className = 'goo-svelte-control'
			resetProps(buildProps())
			instance = mount(component, {
				target: container,
				props: componentProps
			})
			return container
		},

		setValue(nextValue, { silent = true } = {}) {
			updateValue(nextValue)
			if (!silent) {
				onchange(nextValue)
			}
		},

		setOptions(nextOptions) {
			currentOptions = {
				...currentOptions,
				...nextOptions
			}
			resetProps(buildProps())
		},

		getValue() {
			return currentValue
		},

		updateDisplay() {
			if (!object || property === undefined) return
			const nextValue = object[property]
			if (nextValue !== currentValue) {
				this.setValue(nextValue, { silent: true })
			}
		},

		destroy() {
			if (instance) {
				unmount(instance)
				instance = null
			}
			resetProps({})
			container = null
		}
	}

	return host
}
