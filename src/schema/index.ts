/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

/// <reference path="../svelte.d.ts" />

export { default, default as GooSchemaComponent } from './GooSchema.svelte'
export {
	createGooSchema,
	GooSchema,
	type GooSchemaField,
	type GooSchemaFolder,
	type GooSchemaNode,
	type GooSchemaOptions,
	type GooSchemaType
} from './GooSchema.ts'
export * from './pathUtils.ts'
export * from './schemaFieldBuilder.ts'
