/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

export { default, default as GooSchemaComponent } from './GooSchema.svelte'
export type {
	GooSchemaControlType,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaType,
	GooSchemaUpdateOptions } from './GooSchema.ts'
export {
	createGooSchema,
	GooSchema
} from './GooSchema.ts'
