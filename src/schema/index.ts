/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

/// <reference path="../svelte.d.ts" />

export { shouldRenderSchemaNode } from './fieldConditions.ts'
export type { ControllerFieldLayout } from './fieldLayout.ts'
export { getControllerFieldLayout, isSelfContainedField, normalizeFieldLayout } from './fieldLayout.ts'
export { applyFieldValueFormatOptions } from './fieldValueFormat.ts'
export { default, default as GooSchemaComponent } from './GooSchema.svelte'
export type {
	GooSchemaControlType,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaType
} from './GooSchema.ts'
export {
	createGooSchema,
	GooSchema
} from './GooSchema.ts'
export { getByPath, pathToLabel, resolvePath, setByPath } from './pathUtils.ts'
export type { ControllerOptions, NormalizedSelectOption } from './schemaFieldBuilder.ts'
export { buildControllerOptions, detectFieldType, normalizeSelectOptions } from './schemaFieldBuilder.ts'
