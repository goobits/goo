import './GooLabel.css'

/**
 * @fileoverview GooLabel module exports
 * @module goo/label
 */

/// <reference path="../svelte.d.ts" />

export type {
	GooFieldGroupElement,
	GooFieldOptions,
	GooLabeledFieldElement,
	GooLabeledFieldOptions
} from './createField.ts'
export { createFieldGroup, createLabeledField } from './createField.ts'
export { default as GooLabel } from './GooLabel.svelte'
export type { GooLabelProps } from './types.ts'
