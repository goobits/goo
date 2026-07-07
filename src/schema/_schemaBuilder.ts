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
	isSchemaValueEqual,
	schemaHasConditions as hasSchemaConditions
} from './_schemaData.ts'
import { shouldRenderSchemaNode } from './fieldConditions.ts'
import { isFullBleedField, isSelfContainedField } from './fieldLayout.ts'
import { getByPath, resolvePath, setByPath } from './pathUtils.ts'
import { buildControllerOptions, type ControllerOptions } from './schemaFieldBuilder.ts'
import type {
	GooSchemaChangeHandler,
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaPreset,
	GooSchemaState
} from './types.ts'

const SCHEMA_DATA_MOTION_CLASS = 'goo-schema__data-motion'
const SCHEMA_DATA_MOTION_ATTRIBUTE = 'data-goo-schema-data-motion'
const SCHEMA_DATA_MOTION_DURATION_MS = 360
const schemaDataMotionTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

export type GooSchemaController = (HTMLElement | SvelteControlHost) & {
	destroy?: () => void
}

export type GooSchemaBuildElement = HTMLElement & {
	_changeHandler: GooSchemaChangeHandler | null
	_controllers: Map<string, GooSchemaController>
	_data: GooSchemaData
	_destroyed: boolean
	_onpreset: ((preset: GooSchemaPreset) => void) | null
	_onreset: ((data: GooSchemaData) => void) | null
	_rebuildToken: number
	_root: HTMLElement | null
	_toolbar: HTMLElement | null
	_visibilitySignature: string
	state: GooSchemaState
	refresh(): void
	setData(data: GooSchemaData, options?: GooSchemaDataUpdateOptions): void
	_scheduleRebuild(): void
}

type SchemaDataMutationOptions = {
	changedPaths?: ReadonlySet<string>
	update?: GooSchemaDataUpdateOptions
}

export async function rebuildSchema(element: GooSchemaBuildElement): Promise<void> {
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

export function destroySchemaControllers(element: GooSchemaBuildElement): void {
	for (const controller of element._controllers.values()) {
		controller.destroy?.()
	}
	element._controllers.clear()
}

export function getChangedSchemaControllerPaths(
	element: GooSchemaBuildElement,
	nextData: GooSchemaData
): Set<string> {
	const changedPaths = new Set<string>()
	appendChangedSchemaControllerPaths(element, getSchemaNodes(element.state.schema), nextData, changedPaths)
	return changedPaths
}

export function updateSchemaAfterDataMutation(
	element: GooSchemaBuildElement,
	options: SchemaDataMutationOptions = {}
): void {
	if (hasSchemaConditions(element.state.schema)) {
		const nextVisibilitySignature = getSchemaVisibilitySignature(element)
		if (nextVisibilitySignature !== element._visibilitySignature) {
			element._scheduleRebuild()
			return
		}
		element.refresh()
		applySchemaDataMotion(element, options.changedPaths, options.update)
		updateSchemaActionState(element)
		return
	}
	element.refresh()
	applySchemaDataMotion(element, options.changedPaths, options.update)
	updateSchemaActionState(element)
}

function getSchemaNodes(schema: GooSchemaState['schema']): GooSchemaNode[] {
	return Array.isArray(schema) ? schema : schema.children
}

function appendChangedSchemaControllerPaths(
	element: GooSchemaBuildElement,
	nodes: GooSchemaNode[],
	nextData: GooSchemaData,
	changedPaths: Set<string>
): void {
	for (const node of nodes) {
		if ('children' in node && node.type === 'folder') {
			appendChangedSchemaControllerPaths(element, node.children, nextData, changedPaths)
			continue
		}
		if (!('path' in node) || !element._controllers.has(node.path)) {
			continue
		}

		const currentValue = getByPath(element._data, node.path)
		const nextValue = getByPath(nextData, node.path)
		if (!isSchemaValueEqual(currentValue, nextValue)) {
			changedPaths.add(node.path)
		}
	}
}

function applySchemaDataMotion(
	element: GooSchemaBuildElement,
	changedPaths: ReadonlySet<string> | undefined,
	options: GooSchemaDataUpdateOptions | undefined
): void {
	if (!options?.animate || !changedPaths?.size) return
	const reason = options.reason ?? 'sync'
	for (const path of changedPaths) {
		const target = getSchemaControllerMotionElement(element._controllers.get(path))
		if (!target) continue

		const existingTimer = schemaDataMotionTimers.get(target)
		if (existingTimer) clearTimeout(existingTimer)
		target.classList.remove(SCHEMA_DATA_MOTION_CLASS)
		target.removeAttribute(SCHEMA_DATA_MOTION_ATTRIBUTE)
		void target.offsetWidth
		target.setAttribute(SCHEMA_DATA_MOTION_ATTRIBUTE, reason)
		target.classList.add(SCHEMA_DATA_MOTION_CLASS)

		const timer = setTimeout(() => {
			if (!target.isConnected) return
			target.classList.remove(SCHEMA_DATA_MOTION_CLASS)
			target.removeAttribute(SCHEMA_DATA_MOTION_ATTRIBUTE)
			schemaDataMotionTimers.delete(target)
		}, SCHEMA_DATA_MOTION_DURATION_MS)
		schemaDataMotionTimers.set(target, timer)
	}
}

function getSchemaControllerMotionElement(controller: GooSchemaController | undefined): HTMLElement | null {
	if (!controller) return null
	if (controller instanceof HTMLElement) return controller
	return controller.element
}

async function buildNodes(
	element: GooSchemaBuildElement,
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
	element: GooSchemaBuildElement,
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
	element: GooSchemaBuildElement,
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
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
		updateSchemaAfterDataMutation(element)
	}

	controllerOptions.oninput = (value: unknown) => {
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterDataMutation(element)
	}

	const controller = createGooController(controllerOptions)
	controller.name(controllerOptions.label)
	element._controllers.set(node.path, controller)
	controller.addTo(parent)
}

function resolveFieldPath(
	element: GooSchemaBuildElement,
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
	element: GooSchemaBuildElement,
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
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
		updateSchemaAfterDataMutation(element)
	}

	const handleInput = (value: unknown) => {
		object[property] = value
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterDataMutation(element)
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

function isGooSvelteControlModule(module: unknown): module is GooSvelteControlModule {
	return typeof module === 'object'
		&& module !== null
		&& 'default' in module
		&& typeof (module as { default?: unknown }).default === 'function'
}

function mergeClassNames(...values: Array<string | undefined>): string | undefined {
	const className = values
		.flatMap(value => value?.split(/\s+/) ?? [])
		.filter(Boolean)
		.join(' ')
	return className || undefined
}
