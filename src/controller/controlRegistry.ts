/**
 * @fileoverview Canonical control registry for GooController and GooSchema.
 *
 * Native control registry for GooController and GooSchema.
 * Rich Svelte editor controls live in @goobits/goo-editors.
 *
 * @example Adding a new control type:
 * 1. Create your control component in its own folder
 * 2. Add a registry config with `svelte: true` or an explicit `extract`
 * 3. Use the type in GooController or GooSchema
 *
 */

import { createAngleInputField } from '../angle-input/_createAngleInputField.ts'
import * as angleInputModule from '../angle-input/GooAngleInput.svelte'
import * as blendModeModule from '../blend-mode/createBlendModeField.ts'
import { createBlendModeField } from '../blend-mode/createBlendModeField.ts'
import * as buttonModule from '../button/GooButton.svelte'
import { createButtonGroupField } from '../button-group/_createButtonGroupField.ts'
import * as buttonGroupModule from '../button-group/GooButtonGroup.svelte'
import { createCheckboxField } from '../checkbox/_createCheckboxField.ts'
import * as checkboxModule from '../checkbox/GooCheckbox.svelte'
import { createColorField } from '../color/_createColorField.ts'
import * as colorModule from '../color/GooColor.svelte'
import { createInputField, createNumberField } from '../input/_createInputField.ts'
import * as inputModule from '../input/GooInput.svelte'
import * as numberModule from '../input/GooNumber.svelte'
import { createRadioGroupField } from '../radio/_createRadioGroupField.ts'
import * as radioModule from '../radio/GooRadioGroup.svelte'
import { createRangeModuleField } from '../range-module/GooRangeModule.ts'
import * as rangeModule from '../range-module/index.ts'
import { createSelectField } from '../select/_createSelectField.ts'
import * as selectModule from '../select/GooSelect.svelte'
import { createSliderField } from '../slider/_createSliderField.ts'
import * as sliderModule from '../slider/GooSlider.svelte'
import { createTextareaField } from '../textarea/_createTextareaField.ts'
import * as textareaModule from '../textarea/GooTextarea.svelte'
import type { SvelteControlSchema } from './SvelteControl.svelte.ts'

/** Control module structure loaded for a Goo controller type. */
export type GooControlModule = Record<string, unknown>

/** Svelte control module shape loaded for schema-native controls. */
export type GooSvelteControlModule = GooControlModule & {
	/** Svelte component mounted by the Goo control host after runtime validation. */
	default: unknown
	/** Optional binding metadata for value, callbacks, and option props. */
	controlSchema?: SvelteControlSchema
}

/** Built-in Goo control ids understood by the default registry. */
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
  | 'range-module'
  | 'select'
  | 'slider'
  | 'text'
  | 'textarea'
  | 'url'

/** Built-in or host-registered Goo control id. */
export type GooControlType = GooBuiltInControlType | (string & {})

/** Primitive or object value accepted by control option bags. */
export type GooControlOptionValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object
  | ((...args: unknown[]) => unknown)

/** Component-specific option bag passed through `controlOptions`. */
export type GooControlOptionBag = Record<string, GooControlOptionValue>

/** Runtime options passed to constructor/factory functions. */
export interface GooControlOptions {
	[option: string]: unknown
}

/** Control factory function type. */
export type GooControlFactory = (options: GooControlOptions) => HTMLElement

/** Control constructor type. */
export type GooControlConstructor = new (options: GooControlOptions) => HTMLElement

/** Control factory or class type. */
export type GooControlExport = GooControlFactory | GooControlConstructor

/**
 * Goo control type configuration used by GooController and GooSchema extensions.
 */
export interface GooControlTypeConfig {

	/** Lazy import function returning the module */
	load: () => Promise<GooControlModule>

	/**
	 * Extract the control class/factory from the module.
	 * Required for non-Svelte controls.
	 */
	extract?: (module: GooControlModule) => GooControlExport | null

	/**
	 * Build options to pass to the control constructor.
	 * Called with (value, controllerOptions, handleChange, handleInput)
	 */
	buildOptions?: (
		value: unknown,
		options: GooControlOptions,
		handleChange: (v: unknown) => void,
		handleInput?: (v: unknown) => void
	) => GooControlOptions

	/** Synchronous DOM field factory used by dialog fields. */
	createField?: (options: GooControlOptions) => HTMLElement

	/** If true, this is a Svelte component that exports controlSchema. */
	svelte?: boolean

	/** Preferred GooController layout for this control type. */
	layout?: 'inline' | 'stacked'
}

/** Explicit registry entry for a Svelte-backed control module. */
export type GooSvelteControlTypeConfig = Omit<GooControlTypeConfig, 'extract' | 'load' | 'svelte'> & {
	/** Lazy import function returning a Svelte control module. */
	load: () => Promise<GooSvelteControlModule>
	/** Marks the module as a Svelte component control. */
	svelte: true
}

/** Explicit registry entry for a DOM factory-backed control module. */
export type GooFactoryControlTypeConfig = Omit<GooControlTypeConfig, 'extract' | 'svelte'> & {
	/** Extracts the DOM factory/class from the loaded module. */
	extract: (module: GooControlModule) => GooControlExport | null
	/** DOM factory controls are not mounted through the Svelte host. */
	svelte?: false
}

/**
 * Goo control type registry for schema/controller extension points.
 */
export type GooControlTypeRegistry = Record<string, GooControlTypeConfig>

/** Create an explicit Svelte control registry entry. */
export function defineSvelteControlType(
	config: Omit<GooSvelteControlTypeConfig, 'svelte'> & { svelte?: true }
): GooSvelteControlTypeConfig {
	return { ...config, svelte: true }
}

/** Create an explicit DOM factory control registry entry. */
export function defineFactoryControlType(config: GooFactoryControlTypeConfig): GooFactoryControlTypeConfig {
	return config
}

function loadModule(module: object): Promise<GooControlModule> {
	return Promise.resolve(module as GooControlModule)
}

/**
 * Registry of control types.
 *
 * Each entry declares whether it mounts a Svelte component or names the DOM
 * factory/class extractor explicitly.
 */
export const defaultControlRegistry: GooControlTypeRegistry = {
	// Built-in controls
	checkbox: { load: () => loadModule(checkboxModule), svelte: true, createField: createCheckboxField },
	button: { load: () => loadModule(buttonModule), svelte: true },
	range: { load: () => loadModule(sliderModule), svelte: true, createField: createSliderField },
	slider: { load: () => loadModule(sliderModule), svelte: true, createField: createSliderField },
	number: { load: () => loadModule(numberModule), svelte: true, createField: createNumberField },
	select: { load: () => loadModule(selectModule), svelte: true, createField: createSelectField },
	'blend-mode': {
		load: () => loadModule(blendModeModule),
		extract: module => module.createBlendModeField as GooControlFactory,
		createField: createBlendModeField
	},
	radio: { load: () => loadModule(radioModule), svelte: true, createField: createRadioGroupField },
	radiogroup: { load: () => loadModule(radioModule), svelte: true, createField: createRadioGroupField },
	'range-module': {
		load: () => loadModule(rangeModule),
		extract: module => module.createRangeModuleField as GooControlFactory,
		createField: createRangeModuleField
	},
	text: { load: () => loadModule(inputModule), svelte: true, createField: createInputField },
	email: { load: () => loadModule(inputModule), svelte: true, createField: createInputField },
	password: { load: () => loadModule(inputModule), svelte: true, createField: createInputField },
	url: { load: () => loadModule(inputModule), svelte: true, createField: createInputField },
	color: { load: () => loadModule(colorModule), svelte: true, createField: createColorField },
	angle: { load: () => loadModule(angleInputModule), svelte: true, createField: createAngleInputField },
	textarea: { load: () => loadModule(textareaModule), svelte: true, createField: createTextareaField },

	'button-group': {
		load: () => loadModule(buttonGroupModule),
		svelte: true,
		createField: createButtonGroupField,
		layout: 'stacked'
	},
	buttongroup: {
		load: () => loadModule(buttonGroupModule),
		svelte: true,
		createField: createButtonGroupField,
		layout: 'stacked'
	}
}

/**
 * Get control type configuration.
 * @param type - type.
 * @param registry - registry.
 */
export function resolveGooControlTypeConfig(
	type: string,
	registry?: GooControlTypeRegistry
): GooControlTypeConfig | null {
	const entry = registry?.[type] ?? defaultControlRegistry[type]
	return entry ?? null
}
