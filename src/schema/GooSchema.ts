/**
 * @fileoverview GooSchema - schema-driven UI generator for @goobits/goo.
 * @module goobits/schema/GooSchema
 */

import './GooSchema.css'

import { type GooSvelteControlModule, resolveGooControlTypeConfig } from '../controller/controlRegistry.ts'
import { createGooController } from '../controller/GooController.ts'
import { createSvelteControlHost, type SvelteControlHost } from '../controller/SvelteControl.svelte.ts'
import { createFolder, type GooFolderElement } from '../folder/_createFolder.ts'
import { createPanel } from '../panel/_createPanel.ts'
import { schemaLog as log } from '../support/utils/logger.ts'
import { appendSchemaActions, updateSchemaActionState } from './_schemaActions.ts'
import {
	cloneSchemaValue,
	getSchemaVisibilitySignature,
	mergeSchemaData,
	schemaHasConditions
} from './_schemaData.ts'
import { attachSchemaKeyboardNavigation } from './_schemaKeyboardNavigation.ts'
import { shouldRenderSchemaNode } from './fieldConditions.ts'
import { isFullBleedField, isSelfContainedField } from './fieldLayout.ts'
import { getByPath, resolvePath, setByPath } from './pathUtils.ts'
import { buildControllerOptions, type ControllerOptions } from './schemaFieldBuilder.ts'
import type {
	GooSchemaChangeHandler,
	GooSchemaData,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaPreset,
	GooSchemaState,
	GooSchemaType
} from './types.ts'

export { schemaHasConditions } from './_schemaData.ts'
export type {
	GooSchemaChangeHandler,
	GooSchemaControlType,
	GooSchemaData,
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
	setData(data: GooSchemaData): void
	setOptions(options: GooSchemaUpdateOptions): void
	setSchema(schema: GooSchemaType): void
}

type GooSchemaController = (HTMLElement | SvelteControlHost) & {
	destroy?: () => void
}

type GooSchemaInternal = GooSchema & {
	_changeHandler: GooSchemaChangeHandler | null
	_controllers: Map<string, GooSchemaController>
	_data: GooSchemaData
	_destroyed: boolean
	_onpreset: ((preset: GooSchemaPreset) => void) | null
	_onreset: ((data: GooSchemaData) => void) | null
	_rebuildPending: boolean
	_rebuildToken: number
	_root: HTMLElement | null
	_toolbar: HTMLElement | null
	_visibilitySignature: string
	state: GooSchemaState
	_buildField(node: GooSchemaField, parent: HTMLElement, token: number): Promise<void>
	_buildFolder(node: GooSchemaFolder, parent: HTMLElement, token: number): Promise<void>
	_buildNodes(nodes: GooSchemaNode[], parent: HTMLElement, token: number): Promise<void>
	_buildSelfContainedField(
		node: GooSchemaField,
		object: GooSchemaData,
		property: string,
		controllerOptions: ControllerOptions,
		module: GooSvelteControlModule,
		parent: HTMLElement,
		token: number
	): Promise<void>
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
		setData: (data: GooSchemaData) => {
			if (element._destroyed) return
			mergeSchemaData(element._data, data)
			updateSchemaAfterDataMutation(element)
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
		_rebuild: () => rebuildSchema(element),
		_buildNodes: (nodes: GooSchemaNode[], parent: HTMLElement, token: number) =>
			buildNodes(element, nodes, parent, token),
		_buildFolder: (node: GooSchemaFolder, parent: HTMLElement, token: number) =>
			buildFolder(element, node, parent, token),
		_buildField: (node: GooSchemaField, parent: HTMLElement, token: number) =>
			buildField(element, node, parent, token),
		_buildSelfContainedField: (
			node: GooSchemaField,
			object: Record<string, unknown>,
			property: string,
			controllerOptions: ControllerOptions,
			module: GooSvelteControlModule,
			parent: HTMLElement,
			token: number
		) => buildSelfContainedField(element, node, object, property, controllerOptions, module, parent, token)
	})
}

async function rebuildSchema(element: GooSchemaInternal): Promise<void> {
	if (element._destroyed) return
	const token = ++element._rebuildToken

	destroySchemaControllers(element)
	element.replaceChildren()
	element._root = null
	element._toolbar = null

	const schema = element.state.schema
	if (!schema || !element._data) return

	if (element.state.bare) {
		element._root = document.createElement('div')
		element._root.className = 'goo-schema__bare'
		appendSchemaActions(element, element._root)
		const nodes = Array.isArray(schema) ? schema : schema.children
		await buildNodes(element, nodes, element._root, token)
	} else if (Array.isArray(schema)) {
		element._root = createPanel({
			docked: true,
			title: 'Settings',
			collapsible: false,
			showHeader: element.state.showPanelHeader ?? true
		}) as HTMLElement
		appendSchemaActions(element, element._root)
		await buildNodes(element, schema, element._root, token)
	} else if (schema.type === 'panel') {
		element._root = createPanel({
			title: schema.title || 'Settings',
			docked: schema.docked ?? true,
			width: schema.width,
			collapsible: true,
			showHeader: schema.showHeader ?? element.state.showPanelHeader ?? true
		}) as HTMLElement
		appendSchemaActions(element, element._root)
		await buildNodes(element, schema.children, element._root, token)
	}

	if (token !== element._rebuildToken) return
	if (element._root) {
		element.appendChild(element._root)
	}
	element._visibilitySignature = getSchemaVisibilitySignature(element)
}

async function buildNodes(
	element: GooSchemaInternal,
	nodes: GooSchemaNode[],
	parent: HTMLElement,
	token: number
): Promise<void> {
	for (const node of nodes) {
		if (token !== element._rebuildToken) return
		if (!shouldRenderSchemaNode(node, element._data)) continue

		if ('type' in node && node.type === 'folder') {
			await buildFolder(element, node as GooSchemaFolder, parent, token)
		} else if ('path' in node) {
			await buildField(element, node as GooSchemaField, parent, token)
		}
	}
}

async function buildFolder(
	element: GooSchemaInternal,
	node: GooSchemaFolder,
	parent: HTMLElement,
	token: number
): Promise<void> {
	if (token !== element._rebuildToken) return
	const folder: GooFolderElement = createFolder({
		title: node.title,
		open: node.open ?? false,
		className: mergeClassNames(element.state.folderClassName, node.className)
	})

	await buildNodes(element, node.children, folder, token)

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(folder)
	} else {
		parent.appendChild(folder)
	}
}

async function buildField(
	element: GooSchemaInternal,
	node: GooSchemaField,
	parent: HTMLElement,
	token: number
): Promise<void> {
	if (token !== element._rebuildToken) return
	const resolved = resolveFieldPath(element, node.path)

	if (resolved === null) {
		log.warn(`Path "${ node.path }" could not be resolved`)
		return
	}

	const { object, property } = resolved
	const controlTypes = element.state.controlTypes
	const controllerOptions = buildControllerOptions(node, object, property, object[property])
	if (controlTypes) {
		controllerOptions.controlTypes = controlTypes
	}
	if (isFullBleedField(node)) {
		controllerOptions.className = mergeClassNames(controllerOptions.className, 'goo-controller--full-bleed')
	}

	if (node.type) {
		const controlConfig = resolveGooControlTypeConfig(node.type, controlTypes)
		if (controlConfig?.svelte) {
			const module = await controlConfig.load()
			if (token !== element._rebuildToken) return
			if (!isGooSvelteControlModule(module)) {
				log.warn(`Control type "${ node.type }" is marked as Svelte but did not load a default component.`)
				return
			}
			if (module.controlSchema?.selfContained || isSelfContainedField(node)) {
				await buildSelfContainedField(element, node, object, property, controllerOptions, module, parent, token)
				return
			}
		}
	}

	controllerOptions.onchange = (value: unknown) => {
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
		updateSchemaAfterValueMutation(element)
	}

	controllerOptions.oninput = (value: unknown) => {
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterValueMutation(element)
	}

	const controller = createGooController(controllerOptions)
	controller.name(controllerOptions.label)
	element._controllers.set(node.path, controller)
	controller.addTo(parent)
}

function resolveFieldPath(
	element: GooSchemaInternal,
	path: string
): { object: GooSchemaData; property: string } | null {
	const resolved = resolvePath(element._data, path)
	if (resolved) return resolved

	const defaultValue = element.state.defaults ? getByPath(element.state.defaults, path) : undefined
	if (defaultValue === undefined) return null

	setByPath(element._data, path, cloneSchemaValue(defaultValue))
	return resolvePath(element._data, path)
}

async function buildSelfContainedField(
	element: GooSchemaInternal,
	node: GooSchemaField,
	object: GooSchemaData,
	property: string,
	controllerOptions: ControllerOptions,
	module: GooSvelteControlModule,
	parent: HTMLElement,
	token: number
): Promise<void> {
	if (token !== element._rebuildToken) return
	const handleChange = (value: unknown) => {
		object[property] = value
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
		updateSchemaAfterValueMutation(element)
	}

	const handleInput = (value: unknown) => {
		object[property] = value
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterValueMutation(element)
	}

	const { controlOptions, ...controllerBaseOptions } = controllerOptions
	const options = {
		...controllerBaseOptions,
		...controlOptions
	}
	if (!node.label || node.showLabel === false) {
		delete (options as Partial<typeof options>).label
	}

	const host = createSvelteControlHost({
		component: module.default as Parameters<typeof createSvelteControlHost>[0]['component'],
		schema: module.controlSchema,
		value: object[property],
		options,
		onchange: handleChange,
		oninput: handleInput,
		object,
		property
	})

	const hostElement = host.create()
	if (token !== element._rebuildToken) {
		host.destroy()
		return
	}

	element._controllers.set(node.path, host)

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(hostElement)
	} else {
		parent.appendChild(hostElement)
	}
}

function destroySchemaControllers(element: GooSchemaInternal): void {
	for (const controller of element._controllers.values()) {
		controller.destroy?.()
	}
	element._controllers.clear()
}

function isGooSvelteControlModule(module: unknown): module is GooSvelteControlModule {
	return typeof module === 'object'
		&& module !== null
		&& 'default' in module
		&& typeof (module as { default?: unknown }).default === 'function'
}

function updateSchemaAfterValueMutation(element: GooSchemaInternal): void {
	updateSchemaAfterDataMutation(element)
}

function updateSchemaAfterDataMutation(element: GooSchemaInternal): void {
	if (schemaHasConditions(element.state.schema)) {
		const nextVisibilitySignature = getSchemaVisibilitySignature(element)
		if (nextVisibilitySignature !== element._visibilitySignature) {
			element._scheduleRebuild()
			return
		}
		element.refresh()
		updateSchemaActionState(element)
		return
	}
	element.refresh()
	updateSchemaActionState(element)
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

function mergeClassNames(...values: Array<string | undefined>): string | undefined {
	const className = values
		.flatMap(value => value?.split(/\s+/) ?? [])
		.filter(Boolean)
		.join(' ')
	return className || undefined
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
