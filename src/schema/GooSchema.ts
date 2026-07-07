/**
 * @fileoverview GooSchema - schema-driven UI generator for @goobits/goo.
 * @module goobits/schema/GooSchema
 */

import './GooSchema.css'

import { updateSchemaActionState } from './_schemaActions.ts'
import {
	destroySchemaControllers,
	getChangedSchemaControllerPaths,
	type GooSchemaBuildElement,
	rebuildSchema,
	updateSchemaAfterDataMutation
} from './_schemaBuilder.ts'
import {
	mergeSchemaData,
	schemaHasConditions as hasSchemaConditions
} from './_schemaData.ts'
import { attachSchemaKeyboardNavigation } from './_schemaKeyboard.ts'
import type {
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaOptions,
	GooSchemaPreset,
	GooSchemaType
} from './types.ts'

export type {
	GooSchemaChangeHandler,
	GooSchemaControlType,
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaDataUpdateReason,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaPanel,
	GooSchemaPreset,
	GooSchemaState,
	GooSchemaType
} from './types.ts'

/** Detail emitted by GooSchema change/input events. */
export interface GooSchemaEventDetail {
	path: string
	value: unknown
	data: GooSchemaData
}

/** Detail emitted by GooSchema reset events. */
export interface GooSchemaResetEventDetail {
	data: GooSchemaData
	defaults: GooSchemaData
}

/** Detail emitted by GooSchema preset events. */
export interface GooSchemaPresetEventDetail {
	data: GooSchemaData
	id: string
	preset: GooSchemaPreset
}

/** Event names emitted by the GooSchema element. */
export type GooSchemaEventName = 'change' | 'input' | 'preset' | 'reset'

/** DOM custom event emitted by the GooSchema Svelte wrapper and element. */
export type GooSchemaEvent = CustomEvent<GooSchemaEventDetail>

/** DOM custom event emitted when a schema reset is applied. */
export type GooSchemaResetEvent = CustomEvent<GooSchemaResetEventDetail>

/** DOM custom event emitted when a schema preset is applied. */
export type GooSchemaPresetEvent = CustomEvent<GooSchemaPresetEventDetail>

/** Mutable display and control options accepted by a mounted GooSchema handle. */
export type GooSchemaUpdateOptions = Pick<
	GooSchemaOptions,
	'activePresetId' | 'bare' | 'controlTypes' | 'defaults' | 'folderClassName' | 'presets' | 'showPanelHeader' | 'showReset'
>

/** Public imperative handle returned by `createGooSchema`. */
export interface GooSchema extends HTMLElement {
	destroy(): void
	getController(path: string): HTMLElement | undefined
	getData(): GooSchemaData
	getSchema(): GooSchemaType
	refresh(): void
	refreshConditions(): void
	setData(data: GooSchemaData, options?: GooSchemaDataUpdateOptions): void
	setOptions(options: GooSchemaUpdateOptions): void
	setSchema(schema: GooSchemaType): void
}

type GooSchemaInternal = GooSchema & GooSchemaBuildElement & {
	_rebuildPending: boolean
	_rebuild(): Promise<void>
	_scheduleRebuild(): void
}

function initializeSchema(element: GooSchemaInternal, options: GooSchemaOptions): void {
	element.state = {
		disabled: false,
		schema: options.schema || [],
		defaults: options.defaults,
		presets: options.presets,
		activePresetId: options.activePresetId,
		showReset: options.showReset,
		bare: options.bare ?? false,
		showPanelHeader: options.showPanelHeader ?? true,
		folderClassName: options.folderClassName,
		controlTypes: options.controlTypes
	}
	element._data = options.data || {}
	element._destroyed = false
	element._changeHandler = options.onchange || null
	element._onreset = options.onreset || null
	element._onpreset = options.onpreset || null
	element._controllers = new Map()
	element._rebuildToken = 0
	element._rebuildPending = false
	element._root = null
	element._toolbar = null
	element._visibilitySignature = ''
}

function attachSchemaApi(element: GooSchemaInternal): void {
	Object.assign(element, {
		destroy: () => {
			if (element._destroyed) return
			element._destroyed = true
			element._rebuildPending = false
			element._rebuildToken += 1
			destroySchemaControllers(element)
			element._root = null
			element._toolbar = null
			element.replaceChildren()
			element.remove()
		},
		getController: (path: string) => element._controllers.get(path) as HTMLElement | undefined,
		getData: () => element._data,
		getSchema: () => element.state.schema,
		refreshConditions: () => {
			if (element._destroyed) return
			void element._rebuild()
		},
		setData: (data: GooSchemaData, options: GooSchemaDataUpdateOptions = {}) => {
			if (element._destroyed) return
			const changedPaths = options.animate
				? getChangedSchemaControllerPaths(element, data)
				: undefined
			mergeSchemaData(element._data, data)
			updateSchemaAfterDataMutation(element, {
				changedPaths,
				update: options
			})
		},
		setOptions: (options: GooSchemaUpdateOptions) => {
			if (element._destroyed) return
			let shouldRebuild = false
			if ('defaults' in options && element.state.defaults !== options.defaults) {
				element.state.defaults = options.defaults
				shouldRebuild = true
			}
			if ('presets' in options && element.state.presets !== options.presets) {
				element.state.presets = options.presets
				shouldRebuild = true
			}
			if ('activePresetId' in options && element.state.activePresetId !== options.activePresetId) {
				element.state.activePresetId = options.activePresetId
				shouldRebuild = true
			}
			if ('showReset' in options && element.state.showReset !== options.showReset) {
				element.state.showReset = options.showReset
				shouldRebuild = true
			}
			if ('bare' in options && element.state.bare !== options.bare) {
				element.state.bare = options.bare
				shouldRebuild = true
			}
			if ('showPanelHeader' in options && element.state.showPanelHeader !== options.showPanelHeader) {
				element.state.showPanelHeader = options.showPanelHeader
				shouldRebuild = true
			}
			if ('folderClassName' in options && element.state.folderClassName !== options.folderClassName) {
				element.state.folderClassName = options.folderClassName
				shouldRebuild = true
			}
			if ('controlTypes' in options && element.state.controlTypes !== options.controlTypes) {
				element.state.controlTypes = options.controlTypes
				shouldRebuild = true
			}
			if (shouldRebuild) element._scheduleRebuild()
		},
		setSchema: (schema: GooSchemaType) => {
			if (element._destroyed) return
			element.state.schema = schema
			void element._rebuild()
		},
		refresh: () => {
			if (element._destroyed) return
			for (const [ , controller ] of element._controllers) {
				const refreshable = controller as { refresh?: () => void; updateDisplay?: () => void }
				if (refreshable.refresh) {
					refreshable.refresh()
				} else {
					refreshable.updateDisplay?.()
				}
			}
			updateSchemaActionState(element)
		},
		_scheduleRebuild: () => {
			if (element._destroyed) return
			if (element._rebuildPending) return
			element._rebuildPending = true
			queueMicrotask(() => {
				if (element._destroyed) return
				element._rebuildPending = false
				void element._rebuild()
			})
		},
		_rebuild: () => rebuildSchema(element)
	})
}

/** Return true when a GooSchema tree contains conditional nodes. */
export function schemaHasConditions(schema: GooSchemaType): boolean {
	return hasSchemaConditions(schema)
}

function createGooSchemaElement(options: GooSchemaOptions = {}): GooSchema {
	const element = document.createElement('div') as unknown as GooSchemaInternal
	element.className = 'goo-schema'
	initializeSchema(element, options)
	attachSchemaApi(element)
	attachSchemaKeyboardNavigation(element)
	void element._rebuild()
	return element
}

/**
 * Create a GooSchema imperative element handle.
 *
 * @param options - Schema options.
 * @returns Schema element handle.
 */
export function createGooSchema(options: GooSchemaOptions = {}): GooSchema {
	return createGooSchemaElement(options)
}
