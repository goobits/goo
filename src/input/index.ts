/// <reference path="../svelte.d.ts" />

export type {
	NumberInputFieldElement,
	NumberInputFieldOptions,
	TextInputFieldElement,
	TextInputFieldOptions
} from './_createInputField.ts'
export { createInputField, createNumberField } from './_createInputField.ts'
export { default as GooInput } from './GooInput.svelte'
export { default as GooNumber } from './GooNumber.svelte'
export type {
	GooInputProps,
	GooInputType,
	GooNumberProps
} from './types.ts'
