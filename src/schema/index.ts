/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

export { default as GooSchema } from './GooSchema.svelte'
export type {
	GooSchemaChangeHandler,
	GooSchemaControlType,
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaDataUpdateReason,
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
	GooSchemaUpdateOptions } from './GooSchema.ts'
export {
	createGooSchema,
	schemaHasConditions
} from './GooSchema.ts'
