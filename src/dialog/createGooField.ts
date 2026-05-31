/**
 * @fileoverview Factory for creating form fields using Goo components.
 * @module goobits/dialog/createGooField
 */

import type { AngleInputFieldOptions } from '../angle-input/_createAngleInputField.js'
import type { ButtonGroupFieldOptions } from '../button-group/_createButtonGroupField.js'
import type { CheckboxFieldOptions } from '../checkbox/_createCheckboxField.js'
import type { ColorFieldOptions } from '../color/_createColorField.js'
import { resolveControlTypeConfig } from '../controller/controlRegistry.js'
import type { NumberInputFieldOptions, TextInputFieldOptions } from '../input/_createInputField.js'
import type { RadioGroupFieldOptions } from '../radio/_createRadioGroupField.js'
import type { SelectFieldOptions } from '../select/_createSelectField.js'
import type { SliderFieldOptions } from '../slider/_createSliderField.js'
import type { TextareaFieldOptions } from '../textarea/_createTextareaField.js'

type InputFieldType = 'text' | 'email' | 'password' | 'url'
type RadioFieldType = 'radio' | 'radiogroup'

/** Field configuration accepted by createGooField. */
export type GooFieldConfig =
	| ({ type: InputFieldType } & TextInputFieldOptions)
	| ({ type: 'number' } & NumberInputFieldOptions)
	| ({ type: 'textarea' } & TextareaFieldOptions)
	| ({ type: 'checkbox' } & CheckboxFieldOptions)
	| ({ type: 'color' } & ColorFieldOptions)
	| ({ type: RadioFieldType } & RadioGroupFieldOptions)
	| ({ type: 'select' } & SelectFieldOptions)
	| ({ type: 'range' } & SliderFieldOptions)
	| ({ type: 'angle' } & AngleInputFieldOptions)
	| ({ type: 'buttongroup' } & ButtonGroupFieldOptions)

/**
 * Create a form field element using Goo components.
 * @param config - Field configuration.
 * @returns The field element, or null when the type is unknown.
 */
export function createGooField(config: GooFieldConfig): HTMLElement | null {
	return resolveControlTypeConfig(config.type)?.createField?.(config) ?? null
}

/**
 * Create multiple form field elements.
 * @param fields - Array of field configurations.
 * @returns Field elements for all known field types.
 */
export function createGooFields(fields: GooFieldConfig[] = []): HTMLElement[] {
	return fields.map(createGooField).filter((field): field is HTMLElement => field !== null)
}
