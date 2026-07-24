/**
 * @fileoverview GooSchema - schema-driven UI generator for @goobits/goo.
 * @module goobits/schema/GooSchema
 */

import './GooSchema.css'

import {
	type SchemaActionView,
	updateSchemaActionState
} from './_schemaActions.ts'
import {
	destroySchemaControllers,
	type GooSchemaBuildElement,
	rebuildSchema,
	updateSchemaAfterDataMutation
} from './_schemaBuilder.ts'
import {
	cloneSchemaData,
	mergeSchemaData,
	schemaHasConditions as hasSchemaConditions
} from './_schemaData.ts'
import {
	applySchemaScopeDefaults,
	collectChangedSchemaDataPaths,
	createSchemaHistory,
	ROOT_SCHEMA_HISTORY_SCOPE,
	type SchemaHistory,
	type SchemaHistoryScope
} from './_schemaHistory.ts'
import { attachSchemaKeyboardNavigation } from './_schemaKeyboard.ts'
import { assertGooSchemaDescriptor } from './assertGooSchemaDescriptor.ts'
import type {
	GooSchemaCommitDetail,
	GooSchemaCommitHandler,
	GooSchemaCommitNormalizer,
	GooSchemaCommitOptions,
	GooSchemaCommitReason,
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaOptions,
	GooSchemaPreset,
	GooSchemaType
} from './types.ts'

export type {
	GooSchemaActionOptions,
	GooSchemaChangeHandler,
	GooSchemaChoiceOption,
	GooSchemaCommitDetail,
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
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaNote,
	GooSchemaOptions,
	GooSchemaPanel,
	GooSchemaPreset,
	GooSchemaState,
	GooSchemaType,
	GooSchemaWidget
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

/** DOM detail emitted for every final schema transaction. */
export type GooSchemaCommitEventDetail = GooSchemaCommitDetail

/** Event names emitted by the GooSchema element. */
export type GooSchemaEventName = 'change' | 'commit' | 'input' | 'preset' | 'reset'

/** DOM custom event emitted by the GooSchema Svelte wrapper and element. */
export type GooSchemaEvent = CustomEvent<GooSchemaEventDetail>

/** DOM event emitted for every final schema transaction. */
export type GooSchemaCommitEvent = CustomEvent<GooSchemaCommitEventDetail>

/** DOM custom event emitted when a schema reset is applied. */
export type GooSchemaResetEvent = CustomEvent<GooSchemaResetEventDetail>

/** DOM custom event emitted when a schema preset is applied. */
export type GooSchemaPresetEvent = CustomEvent<GooSchemaPresetEventDetail>

/** Mutable display and control options accepted by a mounted GooSchema handle. */
export type GooSchemaUpdateOptions = Pick<
	GooSchemaOptions,
	'actions' | 'activePresetId' | 'bare' | 'controlTypes' | 'defaults' | 'folderActions' | 'folderClassName' | 'normalizeCommit' | 'presets' | 'showPanelHeader' | 'showReset'
>

/** Public imperative handle returned by `createGooSchema`. */
export interface GooSchema extends HTMLElement {
	canRedo(scopeId?: string): boolean
	canUndo(scopeId?: string): boolean
	commitData(data: GooSchemaData, options?: GooSchemaCommitOptions): void
	destroy(): void
	getActionsElement(): HTMLElement | null
	getController(path: string): HTMLElement | undefined
	getData(): GooSchemaData
	getSchema(): GooSchemaType
	redo(scopeId?: string): void
	refresh(): void
	refreshConditions(): void
	reset(scopeId?: string): void
	setActionsTarget(target: HTMLElement | null): void
	setData(data: GooSchemaData, options?: GooSchemaDataUpdateOptions): void
	setOptions(options: GooSchemaUpdateOptions): void
	setSchema(schema: GooSchemaType): void
	undo(scopeId?: string): void
}

type GooSchemaInternal = GooSchema & GooSchemaBuildElement & {
	_actionViews: Map<string, SchemaActionView>
	_actionsTarget: HTMLElement | null
	_commitHandler: GooSchemaCommitHandler | null
	_commitNormalizer: GooSchemaCommitNormalizer | null
	_history: SchemaHistory
	_modifierBlurHandler: () => void
	_modifierKeyHandler: (event: KeyboardEvent) => void
	_rebuildPending: boolean
	_redoMode: boolean
	_scopeBuild: Map<string, SchemaHistoryScope>
	_rebuild(): Promise<void>
	_scheduleRebuild(): void
}

function initializeSchema(element: GooSchemaInternal, options: GooSchemaOptions): void {
	const data = options.data || {}
	element.state = {
		disabled: false,
		schema: options.schema || [],
		defaults: options.defaults,
		actions: options.actions,
		folderActions: options.folderActions,
		presets: options.presets,
		activePresetId: options.activePresetId,
		showReset: options.showReset,
		bare: options.bare ?? false,
		showPanelHeader: options.showPanelHeader ?? true,
		folderClassName: options.folderClassName,
		controlTypes: options.controlTypes
	}
	element._data = data
	element._destroyed = false
	element._changeHandler = options.onchange || null
	element._commitHandler = options.oncommit || null
	element._commitNormalizer = options.normalizeCommit || null
	element._onreset = options.onreset || null
	element._onpreset = options.onpreset || null
	element._actionViews = new Map()
	element._actionsTarget = null
	element._controllers = new Map()
	element._history = createSchemaHistory()
	element._scopeBuild = new Map()
	element._rebuildToken = 0
	element._rebuildPending = false
	element._redoMode = false
	element._root = null
	element._toolbar = null
	element._visibilitySignature = ''
	element._modifierKeyHandler = event => setSchemaRedoMode(element, event.altKey)
	element._modifierBlurHandler = () => setSchemaRedoMode(element, false)
}

function attachSchemaApi(element: GooSchemaInternal): void {
	Object.assign(element, {
		canRedo: (scopeId = ROOT_SCHEMA_HISTORY_SCOPE) => element._history.canRedo(scopeId),
		canUndo: (scopeId = ROOT_SCHEMA_HISTORY_SCOPE) => element._history.canUndo(scopeId),
		commitData: (
			data: GooSchemaData,
			options: GooSchemaCommitOptions = {}
		) => {
			if (element._destroyed) return
			const paths = collectChangedSchemaDataPaths(element._data, data)
			if (!paths.length) return
			mergeSchemaData(element._data, data)
			element._history.record(element._data, paths)
			finalizeSchemaCommit(
				element,
				paths,
				options.reason ?? 'change',
				options.scope ?? ROOT_SCHEMA_HISTORY_SCOPE,
				Boolean(options.animate)
			)
		},
		destroy: () => {
			if (element._destroyed) return
			element._destroyed = true
			element._rebuildPending = false
			element._rebuildToken += 1
			detachSchemaActionModifiers(element)
			destroySchemaControllers(element)
			element._actionViews.clear()
			element._toolbar?.remove()
			element._actionsTarget = null
			element._root = null
			element._toolbar = null
			element.replaceChildren()
			element.remove()
		},
		getActionsElement: () => element._toolbar,
		getController: (path: string) => element._controllers.get(path) as HTMLElement | undefined,
		getData: () => element._data,
		getSchema: () => element.state.schema,
		redo: (scopeId = ROOT_SCHEMA_HISTORY_SCOPE) => {
			element._applyHistory(scopeId, 'redo')
		},
		refreshConditions: () => {
			if (element._destroyed) return
			updateSchemaAfterDataMutation(element)
		},
		reset: (scopeId = ROOT_SCHEMA_HISTORY_SCOPE) => {
			element._resetScope(scopeId)
		},
		setActionsTarget: (target: HTMLElement | null) => {
			if (element._destroyed || element._actionsTarget === target) return
			element._actionsTarget = target
			if (target) {
				target.replaceChildren()
				if (element._toolbar) target.appendChild(element._toolbar)
			} else if (element._toolbar && !element.contains(element._toolbar)) {
				element._scheduleRebuild()
			}
		},
		setData: (data: GooSchemaData, options: GooSchemaDataUpdateOptions = {}) => {
			if (element._destroyed) return
			const changedPaths = collectChangedSchemaDataPaths(element._data, data)
			if (!changedPaths.length) {
				element._history.rebase(element._data)
				updateSchemaAfterDataMutation(element, { update: options })
				return
			}
			mergeSchemaData(element._data, data)
			element._history.rebase(element._data)
			updateSchemaAfterDataMutation(element, {
				changedPaths: new Set(changedPaths),
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
			if ('actions' in options && element.state.actions !== options.actions) {
				element.state.actions = options.actions
				shouldRebuild = true
			}
			if ('folderActions' in options && element.state.folderActions !== options.folderActions) {
				element.state.folderActions = options.folderActions
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
			if ('normalizeCommit' in options) {
				element._commitNormalizer = options.normalizeCommit ?? null
			}
			if (shouldRebuild) element._scheduleRebuild()
		},
		setSchema: (schema: GooSchemaType) => {
			if (element._destroyed) return
			assertGooSchemaDescriptor(schema)
			element.state.schema = schema
			element._history.rebase(element._data)
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
		undo: (scopeId = ROOT_SCHEMA_HISTORY_SCOPE) => {
			element._applyHistory(scopeId, 'undo')
		},
		_applyHistory: (
			scopeId: string,
			direction: 'redo' | 'undo'
		) => {
			if (element._destroyed) return
			const navigation = element._history.navigate(
				scopeId,
				direction,
				element._data
			)
			if (!navigation) return
			mergeSchemaData(element._data, navigation.data)
			finalizeSchemaCommit(
				element,
				navigation.paths,
				direction,
				scopeId,
				true
			)
		},
		_applyPreset: (preset: GooSchemaPreset) => {
			if (element._destroyed) return
			const paths = collectChangedSchemaDataPaths(element._data, preset.data)
			if (paths.length) {
				mergeSchemaData(element._data, preset.data)
				element._history.record(element._data, paths)
				finalizeSchemaCommit(
					element,
					paths,
					'preset',
					ROOT_SCHEMA_HISTORY_SCOPE,
					true
				)
			}
			const detail = { id: preset.id, preset, data: element._data }
			element.dispatchEvent(new CustomEvent('preset', { detail, bubbles: true }))
			element._onpreset?.(preset)
		},
		_beginScopeBuild: () => {
			element._scopeBuild.clear()
			element._scopeBuild.set(ROOT_SCHEMA_HISTORY_SCOPE, {
				history: Boolean(element.state.actions?.history),
				id: ROOT_SCHEMA_HISTORY_SCOPE
			})
			element._history.configure(
				[ ...element._scopeBuild.values() ],
				element._data,
				false
			)
		},
		_commitMutation: (
			paths: readonly string[],
			reason: GooSchemaCommitReason,
			scopeId = ROOT_SCHEMA_HISTORY_SCOPE
		) => {
			if (element._destroyed || !paths.length) return
			const normalized = element._commitNormalizer?.(
				cloneSchemaData(element._data),
				paths
			)
			if (normalized) mergeSchemaData(element._data, normalized)
			element._history.record(element._data, paths)
			finalizeSchemaCommit(element, paths, reason, scopeId, false)
		},
		_finishScopeBuild: () => {
			element._history.configure(
				[ ...element._scopeBuild.values() ],
				element._data
			)
		},
		_registerScope: (scope: SchemaHistoryScope) => {
			element._scopeBuild.set(scope.id, scope)
			element._history.configure(
				[ ...element._scopeBuild.values() ],
				element._data,
				false
			)
		},
		_resetScope: (scopeId: string) => {
			if (element._destroyed || !element.state.defaults) return
			const nextData = applySchemaScopeDefaults(
				element._data,
				element.state.defaults,
				element._history.getScopePaths(scopeId)
			)
			const paths = collectChangedSchemaDataPaths(element._data, nextData)
			if (!paths.length) return
			mergeSchemaData(element._data, nextData)
			element._history.record(element._data, paths)
			finalizeSchemaCommit(element, paths, 'reset', scopeId, true)
			const detail = {
				data: element._data,
				defaults: element.state.defaults
			}
			element.dispatchEvent(new CustomEvent('reset', { detail, bubbles: true }))
			element._onreset?.(element._data)
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

function finalizeSchemaCommit(
	element: GooSchemaInternal,
	paths: readonly string[],
	reason: GooSchemaCommitReason,
	scope: string,
	animate: boolean
): void {
	updateSchemaAfterDataMutation(element, {
		changedPaths: new Set(paths),
		update: { animate, reason }
	})
	updateSchemaActionState(element)
	const detail: GooSchemaCommitDetail = {
		data: element._data,
		paths: [ ...paths ],
		reason,
		scope
	}
	element.dispatchEvent(new CustomEvent('commit', { detail, bubbles: true }))
	element._commitHandler?.(detail)
}

function setSchemaRedoMode(element: GooSchemaInternal, redoMode: boolean): void {
	if (element._redoMode === redoMode) return
	element._redoMode = redoMode
	updateSchemaActionState(element)
}

function attachSchemaActionModifiers(element: GooSchemaInternal): void {
	if (typeof window === 'undefined') return
	window.addEventListener('keydown', element._modifierKeyHandler)
	window.addEventListener('keyup', element._modifierKeyHandler)
	window.addEventListener('blur', element._modifierBlurHandler)
}

function detachSchemaActionModifiers(element: GooSchemaInternal): void {
	if (typeof window === 'undefined') return
	window.removeEventListener('keydown', element._modifierKeyHandler)
	window.removeEventListener('keyup', element._modifierKeyHandler)
	window.removeEventListener('blur', element._modifierBlurHandler)
}

/** Return true when a GooSchema tree contains conditional nodes. */
export function schemaHasConditions(schema: GooSchemaType): boolean {
	return hasSchemaConditions(schema)
}

function createGooSchemaElement(options: GooSchemaOptions = {}): GooSchema {
	if (options.schema !== undefined) assertGooSchemaDescriptor(options.schema)
	const element = document.createElement('div') as unknown as GooSchemaInternal
	element.className = 'goo-schema'
	initializeSchema(element, options)
	attachSchemaApi(element)
	attachSchemaActionModifiers(element)
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

export { assertGooSchemaDescriptor } from './assertGooSchemaDescriptor.ts'
