/**
 * @fileoverview Canonical control registry for GooController and GooSchema.
 *
 * Native control registry for GooController and GooSchema.
 * Rich Svelte editor controls live in @goobits/goo-editors.
 *
 * @example Adding a new control type:
 * 1. Create your control component in its own folder
 * 2. Import its module and add one line here: 'my-control': () => loadModule(myControlModule)
 * 3. Done! GooController will auto-detect or use type: 'my-control'
 *
 */

import { createAngleInputField } from '../angle-input/_createAngleInputField.ts'
import * as angleInputModule from '../angle-input/GooAngleInput.svelte'
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
import { createSelectField } from '../select/_createSelectField.ts'
import * as selectModule from '../select/GooSelect.svelte'
import { createSliderField } from '../slider/_createSliderField.ts'
import * as sliderModule from '../slider/GooSlider.svelte'
import { createTextareaField } from '../textarea/_createTextareaField.ts'
import * as textareaModule from '../textarea/GooTextarea.svelte'

/** Control module structure */
export type ControlModule = Record<string, unknown>

/** Control factory or class type */
export type ControlFactory = ((...args: unknown[]) => unknown) | (new (...args: unknown[]) => unknown)

/** Control options passed to constructor/factory */
export type ControlOptions = Record<string, unknown>

/**
 * Control type config.
 */
export interface ControlTypeConfig {

	/** Lazy import function returning the module */
	load: () => Promise<ControlModule>

	/**
	 * Extract the control class/factory from the module.
	 * Defaults to module.default or first export.
	 */
	extract?: (module: ControlModule) => ControlFactory | null

	/**
	 * Build options to pass to the control constructor.
	 * Called with (value, controllerOptions, handleChange, handleInput)
	 */
	buildOptions?: (
		value: unknown,
		options: ControlOptions,
		handleChange: (v: unknown) => void,
		handleInput?: (v: unknown) => void
	) => ControlOptions

	/** Synchronous DOM field factory used by dialog fields. */
	createField?: (options: ControlOptions) => HTMLElement

	/** If true, this is a Svelte component that exports controlSchema. */
	svelte?: boolean

	/** Preferred GooController layout for this control type. */
	layout?: 'inline' | 'stacked'
}

/**
	 * Control type entry.
	 */
export type ControlTypeEntry = (() => Promise<ControlModule>) | ControlTypeConfig

/**
 * Control type registry.
 */
export type ControlTypeRegistry = Record<string, ControlTypeEntry>

function loadModule(module: object): Promise<ControlModule> {
	return Promise.resolve(module as ControlModule)
}

/**
 * Registry of control types.
 *
 * Simple form: type name → module loader
 * Advanced form: type name → { load, extract?, buildOptions? }
 */
export const defaultControlRegistry: ControlTypeRegistry = {
	// Built-in controls
	checkbox: { load: () => loadModule(checkboxModule), svelte: true, createField: createCheckboxField },
	button: { load: () => loadModule(buttonModule), svelte: true },
	range: { load: () => loadModule(sliderModule), svelte: true, createField: createSliderField },
	slider: { load: () => loadModule(sliderModule), svelte: true, createField: createSliderField },
	number: { load: () => loadModule(numberModule), svelte: true, createField: createNumberField },
	select: { load: () => loadModule(selectModule), svelte: true, createField: createSelectField },
	radio: { load: () => loadModule(radioModule), svelte: true, createField: createRadioGroupField },
	radiogroup: { load: () => loadModule(radioModule), svelte: true, createField: createRadioGroupField },
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
export function resolveControlTypeConfig(
	type: string,
	registry?: ControlTypeRegistry
): ControlTypeConfig | null {
	const entry = registry?.[type] ?? defaultControlRegistry[type]
	if (!entry) return null

	// Simple function form
	if (typeof entry === 'function') {
		return { load: entry }
	}

	// Full config form
	return entry
}
