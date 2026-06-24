/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

/// <reference path="../svelte.d.ts" />

export { default as GooSchema } from './GooSchema.svelte'
export type {
	GooSchemaChangeHandler,
	GooSchemaControlType,
	GooSchemaData,
	GooSchema as GooSchemaElement,
	GooSchemaEvent,
	GooSchemaEventDetail,
	GooSchemaEventName,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaPreset,
	GooSchemaPresetEvent,
	GooSchemaPresetEventDetail,
	GooSchemaResetEvent,
	GooSchemaResetEventDetail,
	GooSchemaType,
	GooSchemaUpdateOptions } from './gooSchema.ts'
export {
	createGooSchema,
	schemaHasConditions
} from './gooSchema.ts'
