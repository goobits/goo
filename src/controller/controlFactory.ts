/**
 * @fileoverview Control factory utilities for GooController.
 * Handles dynamic control loading and instantiation from the type registry.
 * @module goobits/controller/controlFactory
 */

import { log } from '../support/utils/logger.ts'
import {
	type GooControlExport,
	type GooControlOptions,
	type GooControlTypeRegistry,
	type GooSvelteControlModule,
	resolveGooControlTypeConfig
} from './controlRegistry.ts'
import { createSvelteControlHost, type SvelteControlHost } from './SvelteControl.svelte.ts'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a control creation attempt.
 */
export type ControlCreationResult =
  | { status: 'created'; control: HTMLElement }
  | { status: 'not_found' }
  | { status: 'error'; error?: Error }

/**
 * Options for control creation.
 */
export interface ControlCreationOptions {

	/** Current value for the control */
	value: unknown

	/** All controller options for building control options */
	controllerOptions: GooControlOptions

	/** Change handler callback */
	onchange: (value: unknown) => void

	/** Input handler callback */
	oninput?: (value: unknown) => void

	/** Builds options for DOM factory/class controls. */
	buildOptions: (value: unknown, Control: GooControlExport) => GooControlOptions

	/** Optional control type registry override */
	controlTypes?: GooControlTypeRegistry
}

// ============================================================================
// Control Creation
// ============================================================================

/**
 * Create a control from the type registry.
 * Handles async module loading, extraction, and instantiation.
 *
 * @param controlType - The control type name (e.g., 'slider', 'checkbox')
 * @param options - Creation options including value and callbacks
 * @returns Promise resolving to creation result
 *
 * @example
 * const result = await createControlFromRegistry('slider', {
 *   value: 50,
 *   controllerOptions: { min: 0, max: 100 },
 *   onchange: (v) => console.log('Changed:', v),
 *   buildOptions: (value) => ({ value })
 * })
 * if (result.status === 'created') {
 *   container.appendChild(result.control)
 * }
 */
export async function createControlFromRegistry(
	controlType: string,
	options: ControlCreationOptions
): Promise<ControlCreationResult> {
	const config = resolveGooControlTypeConfig(controlType, options.controlTypes)
	if (!config) {
		return { status: 'not_found' }
	}

	try {
		// Load the module
		const module = await config.load()

		// Handle Svelte components with controlSchema.
		if (config.svelte) {
			if (!isSvelteGooControlModule(module)) {
				log.warn(`Control type "${ controlType }" is marked as Svelte but did not load a default component.`)
				return { status: 'error' }
			}
			return createSvelteControl(module, options, controlType)
		}

		if (!config.extract) {
			log.warn(`Control type "${ controlType }" must provide an explicit extractor.`)
			return { status: 'error' }
		}

		// Extract the control class/factory.
		const Control = config.extract(module)

		if (!Control) {
			log.warn(`Could not extract control from module for type: ${ controlType }`)
			return { status: 'error' }
		}

		// Build options for the control
		const controlOptions = config.buildOptions
			? config.buildOptions(
				options.value,
				options.controllerOptions,
				options.onchange,
				options.oninput
			)
			: options.buildOptions(options.value, Control)

		// Create the control instance
		let control: HTMLElement | null = null

		if (typeof Control === 'function') {
			// Check if it's a factory function or a class.
			const isClass = Control.prototype && Control.prototype.constructor === Control
			const GooControlConstructor = Control as new (options: GooControlOptions) => HTMLElement
			const GooControlFactory = Control as (options: GooControlOptions) => HTMLElement
			control = isClass ? new GooControlConstructor(controlOptions) : GooControlFactory(controlOptions)
		}

		if (control) {
			return { status: 'created', control }
		}

		return { status: 'error' }
	} catch(err) {
		log.error(`Failed to create control type "${ controlType }":`, { error: err })
		return { status: 'error', error: err instanceof Error ? err : new Error(String(err)) }
	}
}

/**
 * Create a control from a Svelte component module.
 * Uses a Svelte host with the component's controlSchema.
 * @param options - options.
 * @param module - module.
 * @param controlType - control type.
 */
function createSvelteControl(
	module: GooSvelteControlModule,
	options: ControlCreationOptions,
	controlType: string
): ControlCreationResult {
	const controlOptions = buildSvelteGooControlOptions(controlType, options.controllerOptions)
	const host = createSvelteControlHost({
		component: module.default as Parameters<typeof createSvelteControlHost>[0]['component'],
		schema: module.controlSchema,
		value: options.value,
		options: controlOptions,
		onchange: options.onchange,
		oninput: options.oninput
	})

	const element = host.create()
	if (element) {
		const controlElement = element as HTMLElement & {
			__svelteControlHost?: SvelteControlHost
			setValue?: SvelteControlHost['setValue']
			setOptions?: SvelteControlHost['setOptions']
			getValue?: SvelteControlHost['getValue']
			updateDisplay?: SvelteControlHost['updateDisplay']
			destroy?: SvelteControlHost['destroy']
		}
		controlElement.__svelteControlHost = host
		controlElement.setValue = (value, options) => host.setValue(value, options)
		controlElement.setOptions = options => host.setOptions(options)
		controlElement.getValue = () => host.getValue()
		controlElement.updateDisplay = () => host.updateDisplay()
		controlElement.destroy = () => host.destroy()
		return { status: 'created', control: element }
	}

	return { status: 'error' }
}

function isSvelteGooControlModule(module: unknown): module is GooSvelteControlModule {
	return typeof module === 'object'
		&& module !== null
		&& 'default' in module
		&& typeof (module as { default?: unknown }).default === 'function'
}

function buildSvelteGooControlOptions(controlType: string, controllerOptions: GooControlOptions): GooControlOptions {
	const controlOptions = { ...controllerOptions }
	if (controlType === 'checkbox' && typeof controlOptions.label === 'string') {
		controlOptions.ariaLabel ??= controlOptions.label
		delete controlOptions.label
	}
	return controlOptions
}
