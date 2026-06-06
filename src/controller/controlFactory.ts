/**
 * @fileoverview Control factory utilities for GooController.
 * Handles dynamic control loading and instantiation from the type registry.
 * @module goobits/controller/controlFactory
 */

import { log } from '../support/utils/logger.ts'
import {
	type GooControlExport,
	type GooControlOptions,
	type GooControlOptionValue,
	type GooControlTypeRegistry,
	resolveGooControlTypeConfig
} from './controlRegistry.ts'
import { createSvelteControlHost, type SvelteComponentType, type SvelteControlHost, type SvelteControlSchema } from './SvelteControl.svelte.ts'

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

	/** Custom options builder (overrides default) */
	buildOptions?: (value: unknown, Control: GooControlExport) => GooControlOptions

	/** Optional control type registry override */
	controlTypes?: GooControlTypeRegistry
}

// ============================================================================
// Module Extraction
// ============================================================================

/**
	 * Extract the control factory/class from a module.
	 * Looks for remaining DOM factory exports, default export, or first function export.
	 * @param module - The imported module
	 * @returns The control factory/class or null
	 */
export function extractControlFromModule(
	module: Record<string, unknown>
): GooControlExport | null {
	// Prefer remaining UI* factory exports while schema/controller migration is in progress.
	for (const key of Object.keys(module)) {
		if (key.startsWith('UI') && typeof module[key] === 'function') {
			return module[key] as GooControlExport
		}
	}

	// Fall back to default export
	if (module.default && typeof module.default === 'function') {
		return module.default as GooControlExport
	}

	// Fall back to first function export
	for (const key of Object.keys(module)) {
		if (typeof module[key] === 'function') {
			return module[key] as GooControlExport
		}
	}

	return null
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
 *   onchange: (v) => console.log('Changed:', v)
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
			return createSvelteControl(module as unknown as SvelteGooControlModule, options, controlType)
		}

		// Extract the control class/factory
		const Control = config.extract ? config.extract(module) : extractControlFromModule(module)

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
			: options.buildOptions
				? options.buildOptions(options.value, Control)
				: buildDefaultOptions(options)

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
		log.error(`Failed to create control type "${ controlType }":`, err)
		return { status: 'error', error: err instanceof Error ? err : new Error(String(err)) }
	}
}

/** Module structure for Svelte control components */
interface SvelteGooControlModule {
	default: SvelteComponentType
	controlSchema?: SvelteControlSchema
}

/**
 * Create a control from a Svelte component module.
 * Uses a Svelte host with the component's controlSchema.
 * @param options - options.
 * @param module - module.
 * @param controlType - control type.
 */
function createSvelteControl(
	module: SvelteGooControlModule,
	options: ControlCreationOptions,
	controlType: string
): ControlCreationResult {
	const controlOptions = buildSvelteGooControlOptions(controlType, options.controllerOptions)
	const host = createSvelteControlHost({
		component: module.default,
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

function buildSvelteGooControlOptions(controlType: string, controllerOptions: GooControlOptions): GooControlOptions {
	const controlOptions = { ...controllerOptions }
	if (controlType === 'checkbox' && typeof controlOptions.label === 'string') {
		controlOptions.ariaLabel ??= controlOptions.label
		delete controlOptions.label
	}
	return controlOptions
}

/**
 * Build default options for a control.
 * @param options - Creation options
 * @returns Options object for the control constructor
 */
function buildDefaultOptions(options: ControlCreationOptions): GooControlOptions {
	const { value, controllerOptions, onchange, oninput } = options
	const opts: GooControlOptions = {
		value: value as GooControlOptionValue,
		onchange: (v: unknown) => {
			// Handle both direct values and event objects with .value
			const actualValue =
				typeof v === 'object' && v !== null && 'value' in v ? (v as { value: unknown }).value : v
			onchange(actualValue)
		}
	}

	// Add oninput if provided
	if (oninput) {
		opts.oninput = (v: unknown) => {
			const actualValue =
				typeof v === 'object' && v !== null && 'value' in v ? (v as { value: unknown }).value : v
			oninput(actualValue)
		}
	}

	// Copy relevant options from controller
	const optionKeys = [
		'min',
		'max',
		'step',
		'options',
		'preset',
		'presetColor',
		'presetHue',
		'coverage',
		'unit',
		'label',
		'shape',
		'layout'
	]
	for (const key of optionKeys) {
		if (key in controllerOptions && controllerOptions[key] !== undefined) {
			opts[key] = controllerOptions[key]
		}
	}

	return opts
}
