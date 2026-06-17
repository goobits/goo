/**
 * @fileoverview Factory for creating form fields using Goo components.
 * @module goobits/dialog/createGooField
 */

import type { AngleInputFieldOptions } from '../angle-input/_createAngleInputField.ts'
import type { ButtonGroupFieldOptions } from '../button-group/_createButtonGroupField.ts'
import type { CheckboxFieldOptions } from '../checkbox/_createCheckboxField.ts'
import type { ColorFieldOptions } from '../color/_createColorField.ts'
import { resolveGooControlTypeConfig } from '../controller/controlRegistry.ts'
import type { NumberInputFieldOptions, TextInputFieldOptions } from '../input/_createInputField.ts'
import type { RadioGroupFieldOptions } from '../radio/_createRadioGroupField.ts'
import type { SelectFieldOptions } from '../select/_createSelectField.ts'
import type { SliderPrimitiveFieldOptions } from '../slider/_createSliderPrimitiveField.ts'
import type { TextareaFieldOptions } from '../textarea/_createTextareaField.ts'

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
	| ({ type: 'range' } & SliderPrimitiveFieldOptions)
	| ({ type: 'angle' } & AngleInputFieldOptions)
	| ({ type: 'buttongroup' } & ButtonGroupFieldOptions)

/**
 * Create a form field element using Goo components.
 * @param config - Field configuration.
 * @returns The field element, or null when the type is unknown.
 */
export function createGooField(config: GooFieldConfig): HTMLElement | null {
	return resolveGooControlTypeConfig(config.type)?.createField?.(config) ?? null
}

/**
 * Create multiple form field elements.
 * @param fields - Array of field configurations.
 * @returns Field elements for all known field types.
 */
export function createGooFields(fields: GooFieldConfig[] = []): HTMLElement[] {
	return fields.map(createGooField).filter((field): field is HTMLElement => field !== null)
}
