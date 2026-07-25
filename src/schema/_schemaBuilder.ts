import { createControlFromRegistry } from '../controller/controlFactory.ts'
import {
	type GooControlElement,
	type GooControlOptions,
	type GooControlTypeConfig,
	type GooSvelteControlModule,
	resolveGooControlTypeConfig
} from '../controller/controlRegistry.ts'
import { createGooController } from '../controller/GooController.ts'
import {
	createSvelteControlHost,
	type SvelteControlHost
} from '../controller/SvelteControl.svelte.ts'
import { createFolder, type GooFolderElement } from '../folder/_createFolder.ts'
import { createPanel } from '../panel/_createPanel.ts'
import { schemaLog as log } from '../support/utils/logger.ts'
import {
	appendSchemaActions,
	createSchemaScopeActions,
	resolveSchemaFolderActions,
	type SchemaActionsElement,
	type SchemaActionView,
	updateSchemaActionState
} from './_schemaActions.ts'
import {
	cloneSchemaValue,
	getSchemaVisibilitySignature,
	isSchemaValueEqual,
	schemaHasConditions as hasSchemaConditions
} from './_schemaData.ts'
import {
	ROOT_SCHEMA_HISTORY_SCOPE,
	type SchemaHistory,
	type SchemaHistoryScope
} from './_schemaHistory.ts'
import { localizeSchemaText } from './_schemaText.ts'
import { shouldRenderSchemaNode } from './fieldConditions.ts'
import { isFullBleedField, isSelfContainedField } from './fieldLayout.ts'
import { getByPath, resolvePath, setByPath } from './pathUtils.ts'
import { buildControllerOptions, type ControllerOptions } from './schemaFieldBuilder.ts'
import { createSchemaHeading } from './schemaHeading.ts'
import type {
	GooSchemaChangeHandler,
	GooSchemaCommitReason,
	GooSchemaData,
	GooSchemaDataUpdateOptions,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaHeading,
	GooSchemaNode,
	GooSchemaNote,
	GooSchemaPreset,
	GooSchemaState,
	GooSchemaWidget
} from './types.ts'

const SCHEMA_DATA_MOTION_CLASS = 'goo-schema__data-motion'
const SCHEMA_DATA_MOTION_ATTRIBUTE = 'data-goo-schema-data-motion'
const SCHEMA_DATA_MOTION_DURATION_MS = 360
const schemaDataMotionTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

export type SchemaRebuildOptions = {
	preserveFolderOpenState?: boolean
}

export type GooSchemaController = (HTMLElement | SvelteControlHost) & {
	destroy?: () => void
}

export type GooSchemaBuildElement = HTMLElement & {
	_actionViews: Map<string, SchemaActionView>
	_actionsTarget: HTMLElement | null
	_applyHistory(scopeId: string, direction: 'redo' | 'undo'): void
	_applyPreset(preset: GooSchemaPreset): void
	_changeHandler: GooSchemaChangeHandler | null
	_commitMutation(paths: readonly string[], reason: GooSchemaCommitReason, scopeId?: string): void
	_controllers: Map<string, GooSchemaController>
	_data: GooSchemaData
	_destroyed: boolean
	_history: SchemaHistory
	_onpreset: ((preset: GooSchemaPreset) => void) | null
	_onreset: ((data: GooSchemaData) => void) | null
	_redoMode: boolean
	_rebuildToken: number
	_resetScope(scopeId: string): void
	_root: HTMLElement | null
	_stagedBuild: SchemaBuildTransactionHandle | null
	_toolbar: HTMLElement | null
	_visibilitySignature: string
	state: GooSchemaState
	refresh(): void
	setData(data: GooSchemaData, options?: GooSchemaDataUpdateOptions): void
	_scheduleRebuild(options?: SchemaRebuildOptions): void
}

export type SchemaBuildTransactionHandle = {
	cancel(): void
}

type SchemaBuildTransaction = SchemaBuildTransactionHandle & {
	actionHost: SchemaActionsElement
	actionViews: Map<string, SchemaActionView>
	cancelled: boolean
	committed: boolean
	controllers: Map<string, GooSchemaController>
	root: HTMLElement | null
	scopes: Map<string, SchemaHistoryScope>
	state: GooSchemaState
	token: number
}

type SchemaDataMutationOptions = {
	changedPaths?: ReadonlySet<string>
	update?: GooSchemaDataUpdateOptions
}

export async function rebuildSchema(
	element: GooSchemaBuildElement,
	options: SchemaRebuildOptions = {}
): Promise<void> {
	if (element._destroyed) return
	invalidateSchemaRebuild(element)
	const build = createSchemaBuildTransaction(element)
	element._stagedBuild = build
	const folderOpenState = options.preserveFolderOpenState
		? captureSchemaFolderOpenState(element)
		: undefined

	const schema = build.state.schema
	if (!schema || !element._data) return

	try {
		await populateSchemaBuild(element, build, schema)
	} catch(error) {
		if (element._stagedBuild === build) element._stagedBuild = null
		build.cancel()
		throw error
	}

	if (!isSchemaBuildCurrent(element, build)) {
		build.cancel()
		return
	}
	if (build.root && folderOpenState) {
		restoreSchemaFolderOpenState(build.root, folderOpenState)
	}
	commitSchemaBuild(element, build)
	element._visibilitySignature = getSchemaVisibilitySignature(element)
	updateSchemaActionState(element)
}

async function populateSchemaBuild(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	schema: GooSchemaState['schema']
): Promise<void> {
	if (build.state.bare) {
		build.root = document.createElement('div')
		build.root.className = 'goo-schema__bare'
		appendSchemaActions(build.actionHost, build.root)
		const nodes = Array.isArray(schema) ? schema : schema.children
		await buildNodes(element, build, nodes, build.root)
	} else if (Array.isArray(schema)) {
		build.root = createPanel({
			docked: true,
			title: localizeSchemaText('Settings'),
			collapsible: false,
			showHeader: build.state.showPanelHeader ?? true
		}) as HTMLElement
		appendSchemaActions(build.actionHost, build.root)
		await buildNodes(element, build, schema, build.root)
	} else if (schema.type === 'panel') {
		build.root = createPanel({
			title: localizeSchemaText(schema.title || 'Settings'),
			docked: schema.docked ?? true,
			width: schema.width,
			collapsible: true,
			showHeader: schema.showHeader ?? build.state.showPanelHeader ?? true
		}) as HTMLElement
		appendSchemaActions(build.actionHost, build.root)
		await buildNodes(element, build, schema.children, build.root)
	}
}

export function invalidateSchemaRebuild(element: GooSchemaBuildElement): void {
	element._rebuildToken += 1
	element._stagedBuild?.cancel()
	element._stagedBuild = null
}

function createSchemaBuildTransaction(
	element: GooSchemaBuildElement
): SchemaBuildTransaction {
	const actionViews = new Map<string, SchemaActionView>()
	const state = { ...element.state }
	const actionHost = {
		_actionViews: actionViews,
		_applyHistory: element._applyHistory,
		_applyPreset: element._applyPreset,
		_data: element._data,
		_history: element._history,
		get _redoMode() {
			return element._redoMode
		},
		_resetScope: element._resetScope,
		_toolbar: null,
		state
	} as unknown as SchemaActionsElement
	const build: SchemaBuildTransaction = {
		actionHost,
		actionViews,
		cancelled: false,
		committed: false,
		controllers: new Map<string, GooSchemaController>(),
		root: null,
		scopes: new Map<string, SchemaHistoryScope>([
			[
				ROOT_SCHEMA_HISTORY_SCOPE,
				{
					history: Boolean(state.actions?.history),
					id: ROOT_SCHEMA_HISTORY_SCOPE
				}
			]
		]),
		state,
		token: element._rebuildToken,
		cancel: cancelBuild
	}
	return build

	function cancelBuild(): void {
		if (build.cancelled || build.committed) return
		build.cancelled = true
		destroySchemaControllers(build.controllers)
		build.actionViews.clear()
		build.actionHost._toolbar?.remove()
		build.root?.replaceChildren()
		build.root = null
	}
}

function isSchemaBuildCurrent(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction
): boolean {
	return (
		!element._destroyed
		&& !build.cancelled
		&& element._stagedBuild === build
		&& element._rebuildToken === build.token
	)
}

function commitSchemaBuild(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction
): void {
	const previousControllers = element._controllers
	const previousToolbar = element._toolbar
	const nextToolbar = build.actionHost._toolbar

	element._controllers = build.controllers
	element._actionViews = build.actionViews
	element._root = build.root
	element._toolbar = nextToolbar
	element._stagedBuild = null
	element._history.configure([ ...build.scopes.values() ], element._data)
	build.committed = true

	if (element._actionsTarget) {
		element._actionsTarget.replaceChildren(...(nextToolbar ? [ nextToolbar ] : []))
	}
	element.replaceChildren(...(build.root ? [ build.root ] : []))
	previousToolbar?.remove()
	destroySchemaControllers(previousControllers)
}

function captureSchemaFolderOpenState(element: HTMLElement): Map<string, boolean> {
	const openState = new Map<string, boolean>()
	for (const folder of element.querySelectorAll<GooFolderElement>(
		'.goo-folder[data-goo-schema-scope]'
	)) {
		const scopeId = folder.dataset.gooSchemaScope
		if (scopeId) openState.set(scopeId, folder.open)
	}
	return openState
}

function restoreSchemaFolderOpenState(
	root: HTMLElement,
	openState: ReadonlyMap<string, boolean>
): void {
	for (const folder of root.querySelectorAll<GooFolderElement>(
		'.goo-folder[data-goo-schema-scope]'
	)) {
		const scopeId = folder.dataset.gooSchemaScope
		const open = scopeId ? openState.get(scopeId) : undefined
		if (open !== undefined) folder.setOpen(open, { silent: true })
	}
}

export function destroySchemaControllers(
	controllers: Map<string, GooSchemaController>
): void {
	for (const controller of controllers.values()) {
		controller.destroy?.()
	}
	controllers.clear()
}

export function getChangedSchemaControllerPaths(
	element: GooSchemaBuildElement,
	nextData: GooSchemaData
): Set<string> {
	const changedPaths = new Set<string>()
	appendChangedSchemaControllerPaths(
		element,
		getSchemaNodes(element.state.schema),
		nextData,
		changedPaths
	)
	return changedPaths
}

export function updateSchemaAfterDataMutation(
	element: GooSchemaBuildElement,
	options: SchemaDataMutationOptions = {}
): void {
	if (hasSchemaConditions(element.state.schema)) {
		const nextVisibilitySignature = getSchemaVisibilitySignature(element)
		if (nextVisibilitySignature !== element._visibilitySignature) {
			element._scheduleRebuild({ preserveFolderOpenState: true })
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

function getSchemaControllerMotionElement(
	controller: GooSchemaController | undefined
): HTMLElement | null {
	if (!controller) return null
	if (controller instanceof HTMLElement) return controller
	return controller.element
}

async function buildNodes(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	nodes: GooSchemaNode[],
	parent: HTMLElement
): Promise<void> {
	for (const node of nodes) {
		if (!isSchemaBuildCurrent(element, build)) return
		if (!shouldRenderSchemaNode(node, element._data)) continue

		if ('type' in node && node.type === 'folder') {
			await buildFolder(element, build, node as GooSchemaFolder, parent)
		} else if ('type' in node && node.type === 'heading') {
			buildHeading(node as GooSchemaHeading, parent)
		} else if ('type' in node && node.type === 'note') {
			buildNote(node as GooSchemaNote, parent)
		} else if ('type' in node && node.type === 'widget') {
			await buildWidget(element, build, node as GooSchemaWidget, parent)
		} else if ('path' in node) {
			await buildField(element, build, node as GooSchemaField, parent)
		}
	}
}

function buildNote(node: GooSchemaNote, parent: HTMLElement): void {
	const note = document.createElement('div')
	note.className = mergeClassNames('goo-schema__note', node.className) ?? 'goo-schema__note'
	note.setAttribute('role', 'note')
	note.textContent = localizeSchemaText(node.text) ?? node.text
	appendSchemaChild(parent, note)
}

function buildHeading(node: GooSchemaHeading, parent: HTMLElement): void {
	appendSchemaChild(parent, createSchemaHeading({
		className: node.className,
		icon: node.icon,
		text: localizeSchemaText(node.text) ?? node.text
	}))
}

async function buildWidget(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	node: GooSchemaWidget,
	parent: HTMLElement
): Promise<void> {
	if (!isSchemaBuildCurrent(element, build)) return
	const key = node.id ?? `widget:${ node.widget }:${ build.controllers.size }`
	if (node.layout === 'self-contained') {
		const control = await createDirectSchemaControl({
			controlType: node.widget,
			controlTypes: build.state.controlTypes,
			onchange: () => {},
			oninput: () => {},
			options: node.options ?? {},
			value: undefined
		})
		if (!control || !isSchemaBuildCurrent(element, build)) {
			control?.destroy?.()
			return
		}
		markSelfContainedControl(control, node.widget, node.dock)
		if (node.className) control.classList.add(...node.className.split(/\s+/).filter(Boolean))
		build.controllers.set(key, control)
		appendSchemaChild(parent, control)
		return
	}

	const controller = createGooController({
		label: node.showLabel === false ? '' : localizeSchemaText(node.label) ?? '',
		type: node.widget,
		unbound: true,
		className: mergeClassNames(
			node.className,
			node.layout === 'full-bleed' ? 'goo-controller--full-bleed' : undefined
		),
		layout: node.layout === 'inline' || node.layout === 'stacked' ? node.layout : undefined,
		controlOptions: node.options,
		controlTypes: build.state.controlTypes
	})
	controller.name(node.showLabel === false ? '' : localizeSchemaText(node.label) ?? '')
	build.controllers.set(key, controller)
	controller.addTo(parent)
}

function appendSchemaChild(parent: HTMLElement, child: HTMLElement): void {
	const parentContainer = parent as HTMLElement & { add?: (element: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(child)
	} else {
		parent.appendChild(child)
	}
}

async function buildFolder(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	node: GooSchemaFolder,
	parent: HTMLElement
): Promise<void> {
	if (!isSchemaBuildCurrent(element, build)) return
	const paths = collectSchemaFieldPaths(node.children)
	const scopeId = node.id ?? createFolderScopeId(node, paths)
	const actions = resolveSchemaFolderActions(build.state, node)
	build.scopes.set(scopeId, {
		history: Boolean(actions.history),
		id: scopeId,
		paths
	})
	const headerActions = createSchemaScopeActions(build.actionHost, scopeId, actions)
	const folder: GooFolderElement = createFolder({
		title: localizeSchemaText(node.title) ?? node.title,
		open: node.open ?? false,
		className: mergeClassNames(build.state.folderClassName, node.className),
		headerActions: headerActions ?? undefined
	})
	folder.dataset.gooSchemaScope = scopeId

	await buildNodes(element, build, node.children, folder)
	if (!isSchemaBuildCurrent(element, build)) return

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(folder)
	} else {
		parent.appendChild(folder)
	}
}

async function buildField(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	node: GooSchemaField,
	parent: HTMLElement
): Promise<void> {
	if (!isSchemaBuildCurrent(element, build)) return
	const resolved = resolveFieldPath(element._data, build.state.defaults, node.path)

	if (resolved === null) {
		log.warn(`Path "${ node.path }" could not be resolved`)
		return
	}

	const { object, property } = resolved
	const controlTypes = build.state.controlTypes
	const controllerOptions = buildControllerOptions(node, object, property, object[property], element._data)
	if (controlTypes) {
		controllerOptions.controlTypes = controlTypes
	}
	if (isFullBleedField(node)) {
		controllerOptions.className = mergeClassNames(
			controllerOptions.className,
			'goo-controller--full-bleed'
		)
	}
	if (isSelfContainedField(node) && controllerOptions.type) {
		await buildDirectSchemaField(
			element,
			build,
			node,
			object,
			property,
			controllerOptions,
			parent
		)
		return
	}

	if (node.type) {
		const controlConfig = resolveGooControlTypeConfig(node.type, controlTypes)
		if (controlConfig?.svelte) {
			const module = await controlConfig.load()
			if (!isSchemaBuildCurrent(element, build)) return
			if (!isGooSvelteControlModule(module)) {
				log.warn(
					`Control type "${ node.type }" is marked as Svelte but did not load a default component.`
				)
				return
			}
			if (module.controlSchema?.selfContained || isSelfContainedField(node)) {
				await buildSelfContainedField(
					element,
					build,
					node,
					object,
					property,
					controllerOptions,
					module,
					controlConfig,
					parent
				)
				return
			}
		}
	}

	controllerOptions.onchange = (value: unknown) => {
		element._commitMutation([ node.path ], 'change')
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
	}

	controllerOptions.oninput = (value: unknown) => {
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterDataMutation(element)
	}

	const controller = createGooController(controllerOptions)
	controller.name(controllerOptions.label)
	build.controllers.set(node.path, controller)
	controller.addTo(parent)
}

async function buildDirectSchemaField(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	node: GooSchemaField,
	object: GooSchemaData,
	property: string,
	controllerOptions: ControllerOptions,
	parent: HTMLElement
): Promise<void> {
	const handleChange = (value: unknown) => {
		object[property] = value
		element._commitMutation([ node.path ], 'change')
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
	}
	const handleInput = (value: unknown) => {
		object[property] = value
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterDataMutation(element)
	}
	const control = await createDirectSchemaControl({
		controlType: controllerOptions.type!,
		controlTypes: build.state.controlTypes,
		onchange: handleChange,
		oninput: handleInput,
		options: flattenControllerOptions(controllerOptions),
		value: object[property]
	})
	if (!control || !isSchemaBuildCurrent(element, build)) {
		control?.destroy?.()
		return
	}
	markSelfContainedControl(control, controllerOptions.type!, node.dock)

	const refresh = control.refresh?.bind(control)
	if (!refresh && control.setValue) {
		;(control as GooControlElement & { updateDisplay?: () => void }).updateDisplay = () => {
			control.setValue?.(object[property], { silent: true })
		}
	}

	build.controllers.set(node.path, control)
	appendSchemaChild(parent, control)
}

type DirectSchemaControlOptions = {
	controlType: string
	controlTypes: GooSchemaState['controlTypes']
	onchange: (value: unknown) => void
	oninput: (value: unknown) => void
	options: GooControlOptions
	value: unknown
}

async function createDirectSchemaControl(
	options: DirectSchemaControlOptions
): Promise<GooControlElement | null> {
	const result = await createControlFromRegistry(options.controlType, {
		value: options.value,
		controllerOptions: options.options,
		onchange: options.onchange,
		oninput: options.oninput,
		buildOptions: value => ({
			...options.options,
			value,
			onchange: options.onchange,
			oninput: options.oninput
		}),
		controlTypes: options.controlTypes
	})
	if (result.status === 'created') return result.control
	if (result.status === 'not_found') log.warn(`Unknown control type: ${ options.controlType }`)
	return null
}

function flattenControllerOptions(options: ControllerOptions): GooControlOptions {
	const { controlOptions, object: _object, property: _property, ...baseOptions } = options
	return {
		...baseOptions,
		...controlOptions
	}
}

function markSelfContainedControl(
	control: GooControlElement,
	controlType: string,
	dock?: string
): void {
	control.classList.add('goo-schema__self-contained')
	control.dataset.gooControlType = controlType
	// Shells relocate docked controls by this attribute (see GooSchemaDockZone).
	if (dock) control.dataset.gooDock = dock
}

function resolveFieldPath(
	data: GooSchemaData,
	defaults: GooSchemaData | undefined,
	path: string
): { object: GooSchemaData; property: string } | null {
	const resolved = resolvePath(data, path)
	if (resolved) return resolved

	const defaultValue = defaults ? getByPath(defaults, path) : undefined
	if (defaultValue === undefined) return null

	setByPath(data, path, cloneSchemaValue(defaultValue))
	return resolvePath(data, path)
}

async function buildSelfContainedField(
	element: GooSchemaBuildElement,
	build: SchemaBuildTransaction,
	node: GooSchemaField,
	object: GooSchemaData,
	property: string,
	controllerOptions: ControllerOptions,
	module: GooSvelteControlModule,
	controlConfig: GooControlTypeConfig,
	parent: HTMLElement
): Promise<void> {
	if (!isSchemaBuildCurrent(element, build)) return
	const handleChange = (value: unknown) => {
		object[property] = value
		element._commitMutation([ node.path ], 'change')
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		element._changeHandler?.(node.path, value)
	}

	const handleInput = (value: unknown) => {
		object[property] = value
		const detail = { path: node.path, value, data: element._data }
		element.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		updateSchemaAfterDataMutation(element)
	}

	const { controlOptions, ...controllerBaseOptions } = controllerOptions
	const baseOptions = {
		...controllerBaseOptions,
		...controlOptions
	}
	const options = controlConfig.buildOptions?.(
		object[property],
		baseOptions,
		handleChange,
		handleInput
	) ?? baseOptions
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
	if (!isSchemaBuildCurrent(element, build)) {
		host.destroy()
		return
	}

	build.controllers.set(node.path, host)

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(hostElement)
	} else {
		parent.appendChild(hostElement)
	}
}

function isGooSvelteControlModule(module: unknown): module is GooSvelteControlModule {
	return (
		typeof module === 'object' &&
		module !== null &&
		'default' in module &&
		typeof (module as { default?: unknown }).default === 'function'
	)
}

function mergeClassNames(...values: Array<string | undefined>): string | undefined {
	const className = values
		.flatMap(value => value?.split(/\s+/) ?? [])
		.filter(Boolean)
		.join(' ')
	return className || undefined
}

function collectSchemaFieldPaths(nodes: readonly GooSchemaNode[]): string[] {
	const paths: string[] = []
	for (const node of nodes) {
		if ('children' in node && node.type === 'folder') {
			paths.push(...collectSchemaFieldPaths(node.children))
		} else if ('path' in node) {
			paths.push(node.path)
		}
	}
	return [ ...new Set(paths) ]
}

function createFolderScopeId(
	node: GooSchemaFolder,
	paths: readonly string[]
): string {
	return `folder:${ node.title }:${ paths.join('|') }`
}
