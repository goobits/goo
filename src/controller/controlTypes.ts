import type { SvelteControlSchema } from './SvelteControl.svelte.ts'

/** Control module structure loaded by a Goo control registry entry. */
export type GooControlModule = Record<string, unknown>

/** Svelte control module shape loaded by schema-native controls. */
export type GooSvelteControlModule = GooControlModule & {
	default: unknown
	controlSchema?: SvelteControlSchema
}

/** Built-in control ids understood by Goo. */
export type GooBuiltInControlType =
	| 'angle'
	| 'blend-mode'
	| 'button'
	| 'button-group'
	| 'buttongroup'
	| 'checkbox'
	| 'color'
	| 'email'
	| 'number'
	| 'password'
	| 'radio'
	| 'radiogroup'
	| 'range'
	| 'range-dual'
	| 'select'
	| 'slider'
	| 'slider-field'
	| 'text'
	| 'textarea'
	| 'url'
	| 'xy-pad'

/** Built-in or host-registered Goo control id. */
export type GooControlType = GooBuiltInControlType | (string & {})

/** Value accepted by a component-specific control option bag. */
export type GooControlOptionValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| object
	| ((...args: unknown[]) => unknown)

export type GooControlOptionBag = Record<string, GooControlOptionValue>

export interface GooControlOptions {
	[option: string]: unknown
}

/** DOM control mounted by GooController. */
export interface GooControlElement extends HTMLElement {
	/** Release listeners, component state, and other owned resources. */
	destroy?: () => void
	/** Refresh an unbound control from its own external context. */
	refresh?: () => void
	/** Read the control's current value. */
	getValue?: () => unknown
	/** Update the displayed value without recreating the control. */
	setValue?: (value: unknown, options?: { silent?: boolean }) => void
	/** Update control-specific options without recreating the control. */
	setOptions?: (options: Record<string, unknown>) => void
	/** Disable the control. */
	disable?: () => void
	/** Enable the control. */
	enable?: () => void
	value?: unknown
}

export type GooControlFactory = (options: GooControlOptions) => GooControlElement
export type GooControlConstructor = new (options: GooControlOptions) => GooControlElement
export type GooControlExport = GooControlFactory | GooControlConstructor

export interface GooControlTypeConfigBase {
	buildOptions?: (
		value: unknown,
		options: GooControlOptions,
		handleChange: (value: unknown) => void,
		handleInput?: (value: unknown) => void
	) => GooControlOptions
	createField?: (options: GooControlOptions) => HTMLElement
	svelte?: boolean
	layout?: 'inline' | 'stacked'
}

export type GooSvelteControlTypeConfig = GooControlTypeConfigBase & {
	load: () => Promise<GooSvelteControlModule>
	svelte: true
	extract?: never
}

export type GooFactoryControlTypeConfig = GooControlTypeConfigBase & {
	load: () => Promise<GooControlModule>
	extract: (module: GooControlModule) => GooControlExport | null
	svelte?: false
}

export type GooControlTypeConfig = GooSvelteControlTypeConfig | GooFactoryControlTypeConfig
export type GooControlTypeRegistry = Record<string, GooControlTypeConfig>
