/**
 * @fileoverview GooSchema - schema-driven UI generator for @goobits/goo.
 * @module goobits/schema/GooSchema
 */

import './GooSchema.css'

import { type ControlTypeRegistry, resolveControlTypeConfig } from '../controller/controlRegistry.ts'
import { createGooController } from '../controller/GooController.ts'
import { createSvelteControlHost, type SvelteComponentType, type SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'
import { createFolder, type GooFolderElement } from '../folder/_createFolder.ts'
import { createPanel } from '../panel/_createPanel.ts'
import { schemaLog as log } from '../support/utils/logger.ts'
import { shouldRenderSchemaNode } from './fieldConditions.ts'
import { isSelfContainedField } from './fieldLayout.ts'
import { resolvePath } from './pathUtils.ts'
import { buildControllerOptions, type ControllerOptions } from './schemaFieldBuilder.ts'
import type {
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaState,
	GooSchemaType
} from './types.ts'

export type {
	GooSchemaControlType,
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
	data: Record<string, unknown>
}

/** Public imperative handle returned by `createGooSchema`. */
export interface GooSchema extends HTMLElement {
	bare: boolean
	controlTypes: ControlTypeRegistry | undefined
	data: Record<string, unknown>
	folderClassName: string | undefined
	schema: GooSchemaType
	showPanelHeader: boolean
	destroy(): void
	getController(path: string): unknown
	getData(): Record<string, unknown>
	getSchema(): GooSchemaType
	reevaluateConditions(): void
	setChangeHandler(handler: ((path: string, value: unknown) => void) | null): void
	setData(data: Record<string, unknown>): void
	setSchema(schema: GooSchemaType): void
	updateDisplay(): void
}

type GooSchemaInternal = GooSchema & {
	_changeHandler: ((path: string, value: unknown) => void) | null
	_controllers: Map<string, unknown>
	_data: Record<string, unknown>
	_rebuildPending: boolean
	_rebuildToken: number
	_root: HTMLElement | null
	state: GooSchemaState
	_buildField(node: GooSchemaField, parent: HTMLElement, token: number): Promise<void>
	_buildFolder(node: GooSchemaFolder, parent: HTMLElement, token: number): Promise<void>
	_buildNodes(nodes: GooSchemaNode[], parent: HTMLElement, token: number): Promise<void>
	_buildSelfContainedField(
		node: GooSchemaField,
		object: Record<string, unknown>,
		property: string,
		controllerOptions: ControllerOptions,
		module: { default: SvelteComponentType; controlSchema?: SvelteControlSchema },
		parent: HTMLElement,
		token: number
	): Promise<void>
	_rebuild(): Promise<void>
	_scheduleRebuild(): void
}

/**
 * Factory-compatible named export for callers that previously imported
 * `GooSchema` as a value. Prefer `createGooSchema`.
 *
 * @param options - Schema options.
 * @returns Schema element handle.
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare -- Public API intentionally exposes a value factory and matching handle type.
export function GooSchema(options: GooSchemaOptions = {}): GooSchema {
	return createGooSchema(options)
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
	Object.defineProperties(element, {
		bare: {
			configurable: true,
			get: () => element.state.bare ?? false,
			set: (value: boolean) => {
				if (element.state.bare === value) return
				element.state.bare = value
				element._scheduleRebuild()
			}
		},
		controlTypes: {
			configurable: true,
			get: () => element.state.controlTypes,
			set: (value: ControlTypeRegistry | undefined) => {
				if (value === element.state.controlTypes) return
				element.state.controlTypes = value
				element._scheduleRebuild()
			}
		},
		data: {
			configurable: true,
			get: () => element._data,
			set: (value: Record<string, unknown>) => {
				if (!value || typeof value !== 'object' || value === element._data) return
				element._data = value
				element._scheduleRebuild()
			}
		},
		folderClassName: {
			configurable: true,
			get: () => element.state.folderClassName,
			set: (value: string | undefined) => {
				if (value === element.state.folderClassName) return
				element.state.folderClassName = value
				element._scheduleRebuild()
			}
		},
		schema: {
			configurable: true,
			get: () => element.state.schema,
			set: (value: GooSchemaType) => {
				if (!value || typeof value !== 'object' || value === element.state.schema) return
				element.state.schema = value
				element._scheduleRebuild()
			}
		},
		showPanelHeader: {
			configurable: true,
			get: () => element.state.showPanelHeader ?? true,
			set: (value: boolean) => {
				if (element.state.showPanelHeader === value) return
				element.state.showPanelHeader = value
				element._scheduleRebuild()
			}
		}
	})

	Object.assign(element, {
		destroy: () => {
			element._root = null
			element._controllers.clear()
			element.remove()
		},
		getController: (path: string) => element._controllers.get(path),
		getData: () => element._data,
		getSchema: () => element.state.schema,
		reevaluateConditions: () => {
			void element._rebuild()
		},
		setChangeHandler: (handler: ((path: string, value: unknown) => void) | null) => {
			element._changeHandler = handler
		},
		setData: (data: Record<string, unknown>) => {
			element._data = data
			void element._rebuild()
		},
		setSchema: (schema: GooSchemaType) => {
			element.state.schema = schema
			void element._rebuild()
		},
		updateDisplay: () => {
			for (const [ , controller ] of element._controllers) {
				(controller as { updateDisplay?: () => void }).updateDisplay?.()
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
			module: { default: SvelteComponentType; controlSchema?: SvelteControlSchema },
			parent: HTMLElement,
			token: number
		) => buildSelfContainedField(element, node, object, property, controllerOptions, module, parent, token)
	})
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
		const controlConfig = resolveControlTypeConfig(node.type, controlTypes)
		if (controlConfig?.svelte) {
			const module = await controlConfig.load() as { default: SvelteComponentType; controlSchema?: SvelteControlSchema }
			if (token !== element._rebuildToken) return
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
	object: Record<string, unknown>,
	property: string,
	controllerOptions: ControllerOptions,
	module: { default: SvelteComponentType; controlSchema?: SvelteControlSchema },
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
		component: module.default,
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
