/**
 * @fileoverview GooSchema - schema-driven UI generator for @goobits/goo.
 * @module goobits/schema/GooSchema
 */

import './GooSchema.css'

import { type GooSvelteControlModule, resolveGooControlTypeConfig } from '../controller/controlRegistry.ts'
import { createGooController } from '../controller/GooController.ts'
import { createSvelteControlHost } from '../controller/SvelteControl.svelte.ts'
import { createFolder, type GooFolderElement } from '../folder/_createFolder.ts'
import { createPanel } from '../panel/_createPanel.ts'
import { schemaLog as log } from '../support/utils/logger.ts'
import { shouldRenderSchemaNode } from './fieldConditions.ts'
import { isSelfContainedField } from './fieldLayout.ts'
import { resolvePath } from './pathUtils.ts'
import { buildControllerOptions, type ControllerOptions } from './schemaFieldBuilder.ts'
import type {
	GooSchemaChangeHandler,
	GooSchemaData,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaState,
	GooSchemaType
} from './types.ts'

export type {
	GooSchemaChangeHandler,
	GooSchemaControlType,
	GooSchemaData,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaPanel,
	GooSchemaState,
	GooSchemaType
} from './types.ts'

/** Detail emitted by GooSchema change/input events. */
export interface GooSchemaEventDetail {
	path: string
	value: unknown
	data: GooSchemaData
}

/** Event names emitted by the GooSchema element. */
export type GooSchemaEventName = 'change' | 'input'

/** DOM custom event emitted by the GooSchema Svelte wrapper and element. */
export type GooSchemaEvent = CustomEvent<GooSchemaEventDetail>

/** Mutable display and control options accepted by a mounted GooSchema handle. */
export type GooSchemaUpdateOptions = Pick<
	GooSchemaOptions,
	'bare' | 'controlTypes' | 'folderClassName' | 'showPanelHeader'
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

type GooSchemaInternal = GooSchema & {
	_changeHandler: GooSchemaChangeHandler | null
	_controllers: Map<string, unknown>
	_data: GooSchemaData
	_rebuildPending: boolean
	_rebuildToken: number
	_root: HTMLElement | null
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
		bare: options.bare ?? false,
		showPanelHeader: options.showPanelHeader ?? true,
		folderClassName: options.folderClassName,
		controlTypes: options.controlTypes
	}
	element._data = options.data || {}
	element._changeHandler = options.onchange || null
	element._controllers = new Map()
	element._rebuildToken = 0
	element._rebuildPending = false
	element._root = null
}

function attachSchemaApi(element: GooSchemaInternal): void {
	Object.assign(element, {
		destroy: () => {
			element._root = null
			element._controllers.clear()
			element.remove()
		},
		getController: (path: string) => element._controllers.get(path) as HTMLElement | undefined,
		getData: () => element._data,
		getSchema: () => element.state.schema,
		refreshConditions: () => {
			void element._rebuild()
		},
		setData: (data: GooSchemaData) => {
			mergeSchemaData(element._data, data)
			if (schemaHasConditions(element.state.schema)) {
				element._scheduleRebuild()
				return
			}
			element.refresh()
		},
		setOptions: (options: GooSchemaUpdateOptions) => {
			let shouldRebuild = false
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
			element.state.schema = schema
			void element._rebuild()
		},
		refresh: () => {
			for (const [ , controller ] of element._controllers) {
				(controller as { refresh?: () => void }).refresh?.()
			}
		},
		_scheduleRebuild: () => {
			if (element._rebuildPending) return
			element._rebuildPending = true
			queueMicrotask(() => {
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

function mergeSchemaData(target: GooSchemaData, source: GooSchemaData): void {
	if (target === source) return
	for (const key of Object.keys(target)) {
		if (!(key in source)) {
			delete target[key]
		}
	}
	for (const [ key, value ] of Object.entries(source)) {
		const current = target[key]
		if (isPlainRecord(current) && isPlainRecord(value)) {
			mergeSchemaData(current, value)
		} else {
			target[key] = value
		}
	}
}

function isPlainRecord(value: unknown): value is GooSchemaData {
	return Boolean(value)
		&& typeof value === 'object'
		&& !Array.isArray(value)
		&& Object.getPrototypeOf(value) === Object.prototype
}

function schemaHasConditions(schema: GooSchemaType): boolean {
	const nodes = Array.isArray(schema) ? schema : schema.children
	return nodes.some(nodeHasConditions)
}

function nodeHasConditions(node: GooSchemaNode): boolean {
	if (node.if !== undefined || node.unless !== undefined) return true
	if ('children' in node) return node.children.some(nodeHasConditions)
	return false
}

async function rebuildSchema(element: GooSchemaInternal): Promise<void> {
	const token = ++element._rebuildToken

	element.replaceChildren()
	element._root = null
	element._controllers.clear()

	const schema = element.state.schema
	if (!schema || !element._data) return

	if (element.state.bare) {
		element._root = document.createElement('div')
		element._root.className = 'goo-schema__bare'
		const nodes = Array.isArray(schema) ? schema : schema.children
		await buildNodes(element, nodes, element._root, token)
	} else if (Array.isArray(schema)) {
		element._root = createPanel({
			docked: true,
			title: 'Settings',
			collapsible: false,
			showHeader: element.state.showPanelHeader ?? true
		}) as HTMLElement
		await buildNodes(element, schema, element._root, token)
	} else if (schema.type === 'panel') {
		element._root = createPanel({
			title: schema.title || 'Settings',
			docked: schema.docked ?? true,
			width: schema.width,
			collapsible: true,
			showHeader: schema.showHeader ?? element.state.showPanelHeader ?? true
		}) as HTMLElement
		await buildNodes(element, schema.children, element._root, token)
	}

	if (token !== element._rebuildToken) return
	if (element._root) {
		element.appendChild(element._root)
	}
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
	const resolved = resolvePath(element._data, node.path)

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
	}

	controllerOptions.oninput = (value: unknown) => {
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
	}

	const controller = createGooController(controllerOptions)
	controller.name(controllerOptions.label)
	element._controllers.set(node.path, controller)
	controller.addTo(parent)
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
	}

	const options = { ...controllerOptions }
	if (!node.label || node.showLabel === false) {
		delete options.label
	}

	const host = createSvelteControlHost({
		component: module.default as Parameters<typeof createSvelteControlHost>[0]['component'],
		schema: module.controlSchema,
		value: object[property],
		options,
		onchange: handleChange,
		object,
		property
	})

	const hostElement = host.create()
	if (token !== element._rebuildToken) return

	element._controllers.set(node.path, host)

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(hostElement)
	} else {
		parent.appendChild(hostElement)
	}
}

function isGooSvelteControlModule(module: unknown): module is GooSvelteControlModule {
	return typeof module === 'object'
		&& module !== null
		&& 'default' in module
		&& typeof (module as { default?: unknown }).default === 'function'
}

function createGooSchemaElement(options: GooSchemaOptions = {}): GooSchema {
	const element = document.createElement('div') as unknown as GooSchemaInternal
	element.className = 'goo-schema'
	initializeSchema(element, options)
	attachSchemaApi(element)
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
