/**
 * @fileoverview Canonical control registry for GooController and GooSchema.
 *
 * Native control registry for GooController and GooSchema.
 * Rich Svelte editor controls live in @goobits/goo-editors.
 *
 * @example Adding a new control type:
 * 1. Create your control component in its own folder
 * 2. Import its module and add one line here: 'my-control': () => loadModule(myGooControlModule)
 * 3. Done! GooController will auto-detect or use type: 'my-control'
 *
 */

import { createAngleInputField } from '../angle-input/_createAngleInputField.ts'
import * as angleInputModule from '../angle-input/GooAngleInput.svelte'
import { createBlendModeField } from '../blend-mode/createBlendModeField.ts'
import * as blendModeModule from '../blend-mode/index.ts'
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

/** Control module structure loaded for a Goo controller type. */
export type GooControlModule = Record<string, unknown>

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
	 * Defaults to module.default or first export.
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

/**
 * Goo control type registry entry.
 */
export type GooControlTypeEntry = (() => Promise<GooControlModule>) | GooControlTypeConfig

/**
 * Goo control type registry for schema/controller extension points.
 */
export type GooControlTypeRegistry = Record<string, GooControlTypeEntry>

function loadModule(module: object): Promise<GooControlModule> {
	return Promise.resolve(module as GooControlModule)
}

/**
 * Registry of control types.
 *
 * Simple form: type name → module loader
 * Advanced form: type name → { load, extract?, buildOptions? }
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
 * Normalizes simple function entries to full config objects.
 * @param type - type.
 * @param registry - registry.
 */
export function resolveGooControlTypeConfig(
	type: string,
	registry?: GooControlTypeRegistry
): GooControlTypeConfig | null {
	const entry = registry?.[type] ?? defaultControlRegistry[type]
	if (!entry) return null

	// Simple function form
	if (typeof entry === 'function') {
		return { load: entry }
	}

	// Full config form
	return entry
}
