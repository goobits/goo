/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

export {
	createGooSchema,
	GooSchema,
	type GooSchemaField,
	type GooSchemaFolder,
	type GooSchemaNode,
	type GooSchemaOptions,
	type GooSchemaType
} from './GooSchema.js'
export { default, default as GooSchemaComponent } from './GooSchema.svelte'
export * from './pathUtils.js'
export * from './schemaFieldBuilder.js'
