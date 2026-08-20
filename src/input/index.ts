/// <reference path="../svelte.d.ts" />

export type {
	NumberInputFieldElement,
	NumberInputFieldOptions
} from './_createNumberField.ts'
export { createNumberField } from './_createNumberField.ts'
export type {
	TextInputFieldElement,
	TextInputFieldOptions
} from './_createTextInputField.ts'
export { createInputField } from './_createTextInputField.ts'
export { default as GooInput } from './GooInput.svelte'
export { default as GooNumber } from './GooNumber.svelte'
export type {
	GooInputProps,
	GooInputType,
	GooInputVariant,
	GooNumberProps
} from './types.ts'
