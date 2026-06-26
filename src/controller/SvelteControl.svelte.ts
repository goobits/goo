import * as svelte from 'svelte'

/** Options passed to a Svelte control schema. */
export type ControlSchemaOptions = Record<string, unknown>

/** Svelte component type accepted by mount(). */
export type SvelteComponentType = svelte.Component<Record<string, unknown>>

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

/**
 * Svelte control host options.
 */
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

type MountedControl = ReturnType<typeof svelte.mount>

/**
 * Svelte control host.
 */
export interface SvelteControlHost {
	readonly element: HTMLElement | null
	/**
	 * Create.
	 */
	create(): HTMLElement
	/**
	 * Sets value.
	 *
	 * @param value - value.
	 * @param options - options.
	 */
	setValue(value: unknown, options?: { silent?: boolean }): void
	/**
	 * Sets options.
	 *
	 * @param options - options.
	 */
	setOptions(options: ControlSchemaOptions): void
	/**
	 * Gets value.
	 */
	getValue(): unknown
	/**
	 * Updates display.
	 */
	updateDisplay(): void
	/**
	 * Destroy.
	 */
	destroy(): void
}

/**
 * Mounts a Svelte control as a GooController host.
 * @param opts - opts.
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
	let currentValueKey = getMutableValueKey(value)
	let currentOptions = options

	function updateValue(nextValue: unknown): void {
		const nextValueKey = getMutableValueKey(nextValue)
		const shouldCloneProp =
			Object.is(nextValue, currentValue) &&
			nextValueKey !== currentValueKey &&
			isMutableControlValue(nextValue)
		currentValue = nextValue
		currentValueKey = nextValueKey
		const transformedValue = transformValue(nextValue, currentOptions)
		if (transformedValue === undefined) {
			delete componentProps[valueKey]
			return
		}
		componentProps[valueKey] =
			shouldCloneProp && Object.is(transformedValue, nextValue)
				? cloneControlValue(transformedValue)
				: transformedValue
	}

	function resetProps(nextProps: Record<string, unknown>): void {
		for (const key of Object.keys(componentProps)) {
			delete componentProps[key]
		}
		Object.assign(componentProps, nextProps)
	}

	function buildProps(): Record<string, unknown> {
		const transformedValue = transformValue(currentValue, currentOptions)
		const props: Record<string, unknown> = {
			disabled,
			[changeKey]: (output: unknown) => {
				const nextValue = transformOutput(output, currentOptions)
				updateValue(nextValue)
				onchange(nextValue)
			}
		}
		if (transformedValue !== undefined) {
			props[valueKey] = transformedValue
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
			instance = svelte.mount(component, {
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
			const nextValueKey = getMutableValueKey(nextValue)
			if (!Object.is(nextValue, currentValue) || nextValueKey !== currentValueKey) {
				this.setValue(nextValue, { silent: true })
			}
		},

		destroy() {
			if (instance) {
				svelte.unmount(instance)
				instance = null
			}
			resetProps({})
			container = null
		}
	}

	return host
}

function getMutableValueKey(value: unknown): string {
	if (!isMutableControlValue(value)) return ''
	try {
		return JSON.stringify(value)
	} catch {
		return ''
	}
}

function isMutableControlValue(value: unknown): value is Record<string, unknown> | unknown[] {
	return Boolean(value) && typeof value === 'object'
}

function cloneControlValue<T>(value: T): T {
	if (Array.isArray(value)) return value.map(item => cloneControlValue(item)) as T
	if (!isPlainControlRecord(value)) return value
	return Object.fromEntries(
		Object.entries(value).map(([ key, item ]) => [ key, cloneControlValue(item) ])
	) as T
}

function isPlainControlRecord(value: unknown): value is Record<string, unknown> {
	return (
		Boolean(value) &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	)
}
