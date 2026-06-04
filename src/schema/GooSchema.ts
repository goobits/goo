/**
 * @fileoverview GooSchema - JSON Schema-driven UI generator for @goobits/goo
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

// ============================================================================
// GooSchema Web Component
// ============================================================================

/**
 * Goo schema.
 */
export interface GooSchema extends HTMLElement {
	state: GooSchemaState
	_data: Record<string, unknown>
	_root: HTMLElement | null
	_changeHandler: ((path: string, value: unknown) => void) | null
	_controllers: Map<string, unknown>
	_rebuildToken: number
	_rebuildPending: boolean
}

/**
 * Goo schema.
 */
export class GooSchema {
	static formAssociated = false

	static stateTypes = {
		disabled: 'boolean' as const,
		schema: 'object' as const,
		bare: 'boolean' as const,
		showPanelHeader: 'boolean' as const,
		folderClassName: 'string' as const,
		controlTypes: 'object' as const
	}

	/**
	 * Creates a GooSchema instance.
	 *
	 * @param options - options.
	 */
	constructor(options: GooSchemaOptions = {}) {
		return createGooSchemaElement(options)
	}

	// ─────────────────────────────────────────────────────────────────
	// Public API
	// ─────────────────────────────────────────────────────────────────

	/** Bind data object and rebuild UI 	 * @param data - data.
	 */
	setData(data: Record<string, unknown>): void {
		this._data = data
		this._rebuild()
	}

	/** Get bound data object */
	getData(): Record<string, unknown> {
		return this._data
	}

	/** Update schema and rebuild UI 	 * @param schema - schema.
	 */
	setSchema(schema: GooSchemaType): void {
		this.state.schema = schema
		this._rebuild()
	}

	/** Get current schema */
	getSchema(): GooSchemaType {
		return this.state.schema
	}

	/** Set the programmatic change handler. 	 * @param handler - handler.
	 */
	setChangeHandler(handler: (path: string, value: unknown) => void): void {
		this._changeHandler = handler
	}

	/** Get controller for a specific path 	 * @param path - path.
	 */
	getController(path: string): unknown {
		return this._controllers.get(path)
	}

	/** Update display for all controllers (call after external data changes) */
	updateDisplay(): void {
		for (const [ , controller ] of this._controllers) {
			(controller as { updateDisplay?: () => void }).updateDisplay?.()
		}
	}

	/**
	 * Re-evaluate conditional visibility and rebuild if needed
	 * Call this when data changes that might affect if/unless conditions
	 * Note: This rebuilds the entire UI - for performance, consider
	 * using static conditions or managing visibility manually
	 */
	reevaluateConditions(): void {
		this._rebuild()
	}

	// ─────────────────────────────────────────────────────────────────
	// Property accessors for framework compatibility (Svelte, etc.)
	// These bypass the attribute system which stringifies objects
	// ─────────────────────────────────────────────────────────────────

	/**
	 * Schedule a rebuild on next microtask (debounces multiple property sets)
	 */
	_scheduleRebuild(): void {
		if (this._rebuildPending) return
		this._rebuildPending = true
		queueMicrotask(() => {
			this._rebuildPending = false
			this._rebuild()
		})
	}

	/**
	 * Set schema via property (used by Svelte: schema={brushSchema})
	 * @param value - value.
	 */
	set schema(value: GooSchemaType) {
		if (value && typeof value === 'object') {
			if (value === this.state.schema) return
			this.state.schema = value
			this._scheduleRebuild()
		}
	}

	/**
	 * Schema.
	 */
	get schema(): GooSchemaType {
		return this.state.schema
	}

	/**
	 * Set data via property (used by Svelte: data={layer.brush})
	 * @param value - value.
	 */
	set data(value: Record<string, unknown>) {
		if (value && typeof value === 'object') {
			if (value === this._data) return
			this._data = value
			this._scheduleRebuild()
		}
	}

	/**
	 * Data.
	 */
	get data(): Record<string, unknown> {
		return this._data
	}

	/**
	 * Set controlTypes via property (used by Svelte: controlTypes={demoRegistry})
	 * @param value - value.
	 */
	set controlTypes(value: ControlTypeRegistry | undefined) {
		if (value && typeof value === 'object') {
			if (value === this.state.controlTypes) return
			this.state.controlTypes = value
			this._scheduleRebuild()
		}
	}

	/**
	 * Control types.
	 */
	get controlTypes(): ControlTypeRegistry | undefined {
		return this.state.controlTypes
	}

	/**
	 * Set bare mode via property (used by Svelte: bare={true})
	 * Bare mode renders controls directly without panel wrapper
	 * @param value - value.
	 */
	set bare(value: boolean) {
		if (this.state.bare !== value) {
			this.state.bare = value
			this._scheduleRebuild()
		}
	}

	/**
	 * Bare.
	 */
	get bare(): boolean {
		return this.state.bare ?? false
	}

	/** Set whether generated panels render their header. 	 * @param value - value.
	 */
	set showPanelHeader(value: boolean) {
		if (this.state.showPanelHeader !== value) {
			this.state.showPanelHeader = value
			this._scheduleRebuild()
		}
	}

	/**
	 * Show panel header.
	 */
	get showPanelHeader(): boolean {
		return this.state.showPanelHeader ?? true
	}

	/**
	 * Set classes applied to generated folders.
	 * @param value - folder class names.
	 */
	set folderClassName(value: string | undefined) {
		if (this.state.folderClassName !== value) {
			this.state.folderClassName = value
			this._scheduleRebuild()
		}
	}

	/**
	 * Folder class names.
	 */
	get folderClassName(): string | undefined {
		return this.state.folderClassName
	}

	// ─────────────────────────────────────────────────────────────────
	// Lifecycle
	// ─────────────────────────────────────────────────────────────────

	/**
	 * Creates element.
	 */
	_createElement(): void {
		this._rebuild()
	}

	/**
	 * Destroy element.
	 */
	_destroyElement(): void {
		this._root = null
		this._controllers.clear()
	}

	// ─────────────────────────────────────────────────────────────────
	// Build Methods
	// ─────────────────────────────────────────────────────────────────

	/**
	 * Rebuild.
	 */
	async _rebuild(): Promise<void> {
		const token = ++this._rebuildToken

		// Clear existing
		this.innerHTML = ''
		this._root = null
		this._controllers.clear()

		const schema = this.state.schema
		if (!schema || !this._data) return

		// Bare mode: render controls directly without panel wrapper
		if (this.state.bare) {
			this._root = document.createElement('div')
			this._root.className = 'goo-schema__bare'
			const nodes = Array.isArray(schema) ? schema : schema.children
			await this._buildNodes(nodes, this._root, token)
		}

		// Build from schema with panel wrapper
		else if (Array.isArray(schema)) {
			// Array of nodes - wrap in docked panel
			this._root = createPanel({
				docked: true,
				title: 'Settings',
				collapsible: false,
				showHeader: this.state.showPanelHeader ?? true
			}) as HTMLElement
			await this._buildNodes(schema, this._root, token)
		} else if (schema.type === 'panel') {
			this._root = createPanel({
				title: schema.title || 'Settings',
				docked: schema.docked ?? true,
				width: schema.width,
				collapsible: true,
				showHeader: schema.showHeader ?? this.state.showPanelHeader ?? true
			}) as HTMLElement
			await this._buildNodes(schema.children, this._root, token)
		}

		if (token !== this._rebuildToken) return

		if (this._root) {
			this.appendChild(this._root)
		}
	}

	/**
	 * Builds nodes.
	 *
	 * @param nodes - nodes.
	 * @param parent - parent.
	 * @param token - token.
	 */
	async _buildNodes(nodes: GooSchemaNode[], parent: HTMLElement, token: number): Promise<void> {
		for (const node of nodes) {
			if (token !== this._rebuildToken) return

			// Check conditional visibility (static - evaluated once at build time)
			if (!shouldRenderSchemaNode(node, this._data)) continue

			if ('type' in node && node.type === 'folder') {
				await this._buildFolder(node as GooSchemaFolder, parent, token)
			} else if ('path' in node) {
				await this._buildField(node as GooSchemaField, parent, token)
			}
		}
	}

	/**
	 * Builds folder.
	 *
	 * @param node - node.
	 * @param parent - parent.
	 * @param token - token.
	 */
	async _buildFolder(node: GooSchemaFolder, parent: HTMLElement, token: number): Promise<void> {
		if (token !== this._rebuildToken) return
		const folder: GooFolderElement = createFolder({
			title: node.title,
			open: node.open ?? false,
			className: mergeClassNames(this.state.folderClassName, node.className)
		})

		await this._buildNodes(node.children, folder, token)

		const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
		if (typeof parentContainer.add === 'function') {
			parentContainer.add(folder)
		} else {
			parent.appendChild(folder)
		}
	}

	/**
	 * Builds field.
	 *
	 * @param node - node.
	 * @param parent - parent.
	 * @param token - token.
	 */
	async _buildField(node: GooSchemaField, parent: HTMLElement, token: number): Promise<void> {
		if (token !== this._rebuildToken) return
		const resolved = resolvePath(this._data, node.path)

		if (resolved === null) {
			log.warn(`Path "${ node.path }" could not be resolved`)
			return
		}

		const { object, property } = resolved

		const controlTypes = this.state.controlTypes

		// Build controller options using extracted builder
		const controllerOptions = buildControllerOptions(node, object, property, object[property])
		if (controlTypes) {
			controllerOptions.controlTypes = controlTypes
		}

		// Check if this is a selfContained Svelte control
		if (node.type) {
			const controlConfig = resolveControlTypeConfig(node.type, controlTypes)
			if (controlConfig?.svelte) {
				const module = await controlConfig.load() as { default: SvelteComponentType; controlSchema?: SvelteControlSchema }
				if (token !== this._rebuildToken) return
				if (module.controlSchema?.selfContained || isSelfContainedField(node)) {
					// Render selfContained control directly without goo-controller wrapper
					await this._buildSelfContainedField(
						node,
						object,
						property,
						controllerOptions,
						module,
						parent,
						token
					)
					return
				}
			}
		}

		controllerOptions.onchange = (value: unknown) => {
			const detail = { path: node.path, value, data: this._data }

			// Dispatch DOM event for framework integrations
			this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))

			// Call callback for programmatic usage
			this._changeHandler?.(node.path, value)
		}

		// Also wire up input events for continuous feedback
		controllerOptions.oninput = (value: unknown) => {
			const detail = { path: node.path, value, data: this._data }
			this.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		}

		const controller = createGooController(controllerOptions)

		// Set label
		controller.name(controllerOptions.label)

		// Track controller by path
		this._controllers.set(node.path, controller)

		// Add to parent
		controller.addTo(parent)
	}

	/**
	 * Build a selfContained field - renders Svelte control directly without goo-controller wrapper.
	 * Used for visual editors that have their own complete UI (header, controls, canvas).
	 * @param token - token.
	 * @param property - property.
	 * @param parent - parent.
	 * @param object - object.
	 * @param node - node.
	 * @param module - module.
	 * @param controllerOptions - controller options.
	 */
	async _buildSelfContainedField(
		node: GooSchemaField,
		object: Record<string, unknown>,
		property: string,
		controllerOptions: ControllerOptions,
		module: { default: SvelteComponentType; controlSchema?: SvelteControlSchema },
		parent: HTMLElement,
		token: number
	): Promise<void> {
		if (token !== this._rebuildToken) return
		const handleChange = (value: unknown) => {
			object[property] = value
			const detail = { path: node.path, value, data: this._data }
			this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
			this._changeHandler?.(node.path, value)
		}

		// For selfContained controls, only pass label if explicitly requested in schema.
		// This allows the component to use its own default label.
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

		const element = host.create()
		if (token !== this._rebuildToken) return

		this._controllers.set(node.path, host)

		// Add directly to parent
		const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
		if (typeof parentContainer.add === 'function') {
			parentContainer.add(element)
		} else {
			parent.appendChild(element)
		}
	}

}

// ============================================================================
// Factory & Export
// ============================================================================

function initializeSchema(element: GooSchema, options: GooSchemaOptions): void {
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
}

function attachSchemaMethods(element: GooSchema): void {
	const nativePrototype = Object.getPrototypeOf(element)
	if (Object.getPrototypeOf(GooSchema.prototype) !== nativePrototype) {
		Object.setPrototypeOf(GooSchema.prototype, nativePrototype)
	}
	Object.setPrototypeOf(element, GooSchema.prototype)
}

function createGooSchemaElement(options: GooSchemaOptions = {}): GooSchema {
	const element = document.createElement('div') as unknown as GooSchema
	element.className = 'goo-schema'
	attachSchemaMethods(element)
	initializeSchema(element, options)
	element._createElement()
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
 * Factory function for creating GooSchema instances
 * @param options - options.
 */
export function createGooSchema(options: GooSchemaOptions & {
	schema: GooSchemaType
	data: Record<string, unknown>
}): GooSchema {
	return createGooSchemaElement(options)
}
