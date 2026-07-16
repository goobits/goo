/**
 * @module goobits/angle-input
 * Angle input with circular dial and number input.
 */

/// <reference path="../svelte.d.ts" />

export type {
	AngleInputFieldElement,
	AngleInputFieldOptions
} from './_createAngleInputField.ts'
export { createAngleInputField } from './_createAngleInputField.ts'
export { default as GooAngleInput } from './GooAngleInput.svelte'
export type {
	GooAngleInputElement,
	GooAngleInputEventData,
	GooAngleInputProps,
	GooAngleInputUnit
} from './types.ts'
