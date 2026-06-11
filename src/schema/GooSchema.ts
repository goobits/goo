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

type GooSchemaInternal = GooSchema & {
	_changeHandler: GooSchemaChangeHandler | null
	_controllers: Map<string, unknown>
	_data: GooSchemaData
	_onpreset: ((preset: GooSchemaPreset) => void) | null
	_onreset: ((data: GooSchemaData) => void) | null
	_rebuildPending: boolean
	_rebuildToken: number
	_root: HTMLElement | null
	_toolbar: HTMLElement | null
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
	element._changeHandler = options.onchange || null
	element._onreset = options.onreset || null
	element._onpreset = options.onpreset || null
	element._controllers = new Map()
	element._rebuildToken = 0
	element._rebuildPending = false
	element._root = null
	element._toolbar = null
}

function attachSchemaApi(element: GooSchemaInternal): void {
	Object.assign(element, {
		destroy: () => {
			element._root = null
			element._toolbar = null
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
			updateSchemaActionState(element)
		},
		setOptions: (options: GooSchemaUpdateOptions) => {
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
			element.state.schema = schema
			void element._rebuild()
		},
		refresh: () => {
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

export function schemaHasConditions(schema: GooSchemaType): boolean {
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
	element._toolbar = null
	element._controllers.clear()

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
		updateSchemaActionState(element)
	}

	controllerOptions.oninput = (value: unknown) => {
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaActionState(element)
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
		updateSchemaActionState(element)
	}

	const handleInput = (value: unknown) => {
		object[property] = value
		const detail: GooSchemaEventDetail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaActionState(element)
	}

	const { controlOptions, ...controllerBaseOptions } = controllerOptions
	const options = {
		...controllerBaseOptions,
		...controlOptions
	}
	if (!node.label || node.showLabel === false) {
		delete options.label
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

function appendSchemaActions(element: GooSchemaInternal, parent: HTMLElement): void {
	if (!shouldRenderSchemaActions(element)) return

	const toolbar = document.createElement('div')
	toolbar.className = 'goo-schema__actions'

	const presets = element.state.presets ?? []
	if (presets.length) {
		const select = document.createElement('select')
		select.className = 'goo-schema__preset-select'
		select.ariaLabel = 'Schema preset'

		for (const preset of presets) {
			const option = document.createElement('option')
			option.value = preset.id
			option.textContent = preset.label
			option.selected = preset.id === element.state.activePresetId
			select.appendChild(option)
		}

		select.addEventListener('change', () => {
			const preset = presets.find(candidate => candidate.id === select.value)
			if (!preset) return
			applySchemaPreset(element, preset)
		})
		toolbar.appendChild(select)
	}

	if (element.state.showReset && element.state.defaults) {
		const reset = document.createElement('button')
		reset.className = 'goo-schema__reset'
		reset.type = 'button'
		reset.textContent = 'Reset'
		reset.title = 'Reset to defaults'
		reset.addEventListener('click', () => resetSchemaToDefaults(element))
		toolbar.appendChild(reset)
	}

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(toolbar)
	} else {
		parent.appendChild(toolbar)
	}
	element._toolbar = toolbar
	updateSchemaActionState(element)
}

function shouldRenderSchemaActions(element: GooSchemaInternal): boolean {
	return Boolean((element.state.presets?.length ?? 0) > 0 || (element.state.showReset && element.state.defaults))
}

function applySchemaPreset(element: GooSchemaInternal, preset: GooSchemaPreset): void {
	const data = cloneSchemaData(preset.data)
	element.setData(data)
	const detail: GooSchemaPresetEventDetail = { id: preset.id, preset, data: element._data }
	element.dispatchEvent(new CustomEvent('preset', { detail, bubbles: true }))
	element._onpreset?.(preset)
}

function resetSchemaToDefaults(element: GooSchemaInternal): void {
	const defaults = element.state.defaults
	if (!defaults) return
	const data = cloneSchemaData(defaults)
	element.setData(data)
	const detail: GooSchemaResetEventDetail = { data: element._data, defaults }
	element.dispatchEvent(new CustomEvent('reset', { detail, bubbles: true }))
	element._onreset?.(element._data)
}

function updateSchemaActionState(element: GooSchemaInternal): void {
	const toolbar = element._toolbar
	if (!toolbar) return

	const reset = toolbar.querySelector<HTMLButtonElement>('.goo-schema__reset')
	if (reset && element.state.defaults) {
		reset.disabled = isSchemaDataEqual(element._data, element.state.defaults)
	}

	const select = toolbar.querySelector<HTMLSelectElement>('.goo-schema__preset-select')
	if (select && element.state.activePresetId !== undefined && select.value !== element.state.activePresetId) {
		select.value = element.state.activePresetId ?? ''
	}
}

function cloneSchemaData(data: GooSchemaData): GooSchemaData {
	return cloneSchemaValue(data) as GooSchemaData
}

function cloneSchemaValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(cloneSchemaValue)
	if (isPlainRecord(value)) {
		return Object.fromEntries(Object.entries(value).map(([ key, child ]) => [ key, cloneSchemaValue(child) ]))
	}
	return value
}

function isSchemaDataEqual(left: GooSchemaData, right: GooSchemaData): boolean {
	return isSchemaValueEqual(left, right)
}

function isSchemaValueEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true
	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
		return left.every((value, index) => isSchemaValueEqual(value, right[index]))
	}
	if (isPlainRecord(left) || isPlainRecord(right)) {
		if (!isPlainRecord(left) || !isPlainRecord(right)) return false
		const leftKeys = Object.keys(left)
		const rightKeys = Object.keys(right)
		if (leftKeys.length !== rightKeys.length) return false
		return leftKeys.every(key => key in right && isSchemaValueEqual(left[key], right[key]))
	}
	return false
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
