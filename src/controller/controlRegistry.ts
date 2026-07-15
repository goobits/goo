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
import { createSelectField } from '../select/_createSelectField.ts'
import * as selectModule from '../select/GooSelect.svelte'
import { createSliderPrimitiveField } from '../slider/_createSliderPrimitiveField.ts'
import * as sliderModule from '../slider/GooSlider.svelte'
import { createSliderField } from '../slider-field/GooSliderField.ts'
import * as sliderFieldModule from '../slider-field/index.ts'
import { createTextareaField } from '../textarea/_createTextareaField.ts'
import * as textareaModule from '../textarea/GooTextarea.svelte'
import * as xyPadModule from '../xy-pad/GooXyPad.svelte'
import type {
	GooControlFactory,
	GooControlModule,
	GooControlTypeConfig,
	GooControlTypeRegistry,
	GooFactoryControlTypeConfig,
	GooSvelteControlModule,
	GooSvelteControlTypeConfig
} from './controlTypes.ts'

export type {
	GooBuiltInControlType,
	GooControlConstructor,
	GooControlElement,
	GooControlExport,
	GooControlFactory,
	GooControlModule,
	GooControlOptionBag,
	GooControlOptions,
	GooControlOptionValue,
	GooControlType,
	GooControlTypeConfig,
	GooControlTypeRegistry,
	GooFactoryControlTypeConfig,
	GooSvelteControlModule,
	GooSvelteControlTypeConfig
} from './controlTypes.ts'

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

function loadSvelteModule(module: object): Promise<GooSvelteControlModule> {
	return Promise.resolve(module as GooSvelteControlModule)
}

/**
 * Registry of control types.
 *
 * Each entry declares whether it mounts a Svelte component or names the DOM
 * factory/class extractor explicitly.
 */
export const defaultControlRegistry: GooControlTypeRegistry = {
	// Built-in controls
	checkbox: defineSvelteControlType({ load: () => loadSvelteModule(checkboxModule), createField: createCheckboxField }),
	button: defineSvelteControlType({ load: () => loadSvelteModule(buttonModule) }),
	range: defineSvelteControlType({ load: () => loadSvelteModule(sliderModule), createField: createSliderPrimitiveField }),
	slider: defineSvelteControlType({ load: () => loadSvelteModule(sliderModule), createField: createSliderPrimitiveField }),
	number: defineSvelteControlType({ load: () => loadSvelteModule(numberModule), createField: createNumberField }),
	select: defineSvelteControlType({ load: () => loadSvelteModule(selectModule), createField: createSelectField }),
	'blend-mode': defineFactoryControlType({
		load: () => loadModule(blendModeModule),
		extract: module => module.createBlendModeField as GooControlFactory,
		createField: createBlendModeField
	}),
	radio: defineSvelteControlType({ load: () => loadSvelteModule(radioModule), createField: createRadioGroupField }),
	radiogroup: defineSvelteControlType({ load: () => loadSvelteModule(radioModule), createField: createRadioGroupField }),
	'slider-field': defineFactoryControlType({
		load: () => loadModule(sliderFieldModule),
		extract: module => module.createSliderField as GooControlFactory,
		createField: createSliderField
	}),
	text: defineSvelteControlType({ load: () => loadSvelteModule(inputModule), createField: createInputField }),
	email: defineSvelteControlType({ load: () => loadSvelteModule(inputModule), createField: createInputField }),
	password: defineSvelteControlType({ load: () => loadSvelteModule(inputModule), createField: createInputField }),
	url: defineSvelteControlType({ load: () => loadSvelteModule(inputModule), createField: createInputField }),
	color: defineSvelteControlType({ load: () => loadSvelteModule(colorModule), createField: createColorField }),
	angle: defineSvelteControlType({ load: () => loadSvelteModule(angleInputModule), createField: createAngleInputField }),
	textarea: defineSvelteControlType({ load: () => loadSvelteModule(textareaModule), createField: createTextareaField }),
	'xy-pad': defineSvelteControlType({
		load: () => loadSvelteModule(xyPadModule),
		layout: 'stacked'
	}),

	'button-group': defineSvelteControlType({
		load: () => loadSvelteModule(buttonGroupModule),
		createField: createButtonGroupField,
		layout: 'stacked'
	}),
	buttongroup: defineSvelteControlType({
		load: () => loadSvelteModule(buttonGroupModule),
		createField: createButtonGroupField,
		layout: 'stacked'
	})
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
