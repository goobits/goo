/**
 * @fileoverview GooSchema - JSON Schema-driven UI for @goobits/goo
 * @module goobits/schema
 */

export { default as GooSchema } from './GooSchema.svelte'
export type {
	GooSchemaActionOptions,
	GooSchemaChangeHandler,
	GooSchemaChoiceOption,
	GooSchemaCommitDetail,
	GooSchemaCommitEvent,
	GooSchemaCommitEventDetail,
	GooSchemaCommitHandler,
	GooSchemaCommitNormalizer,
	GooSchemaCommitOptions,
	GooSchemaCommitReason,
	GooSchemaControlOptions,
	GooSchemaControlType,
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaDataUpdateReason,
	GooSchemaDescriptorPrimitive,
	GooSchemaDescriptorValue,
	GooSchema as GooSchemaElement,
	GooSchemaEvent,
	GooSchemaEventDetail,
	GooSchemaEventName,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaNote,
	GooSchemaOptions,
	GooSchemaPreset,
	GooSchemaPresetEvent,
	GooSchemaPresetEventDetail,
	GooSchemaResetEvent,
	GooSchemaResetEventDetail,
	GooSchemaType,
	GooSchemaUpdateOptions,
	GooSchemaWidget
} from './GooSchema.ts'
export {
	assertGooSchemaDescriptor,
	createGooSchema,
	schemaHasConditions
} from './GooSchema.ts'
export { getByPath, pathToLabel, resolvePath, setByPath } from './pathUtils.ts'
export { createSchemaHeading, type SchemaHeadingOptions } from './schemaHeading.ts'
export { defineGooSchemaWidget } from './schemaWidget.ts'
