/**
 * @fileoverview Schema field building utilities.
 * Pure functions for detecting field types and building controller options.
 * @module goobits/schema/schemaFieldBuilder
 */

import type { GooControlOptionBag, GooControlTypeRegistry } from '../controller/controlRegistry.ts'
import type { GooControllerOptions } from '../controller/GooController.ts'
import { localizeSchemaText } from './_schemaText.ts'
import { shouldRenderSchemaItem } from './fieldConditions.ts'
import { getControllerFieldLayout } from './fieldLayout.ts'
import { applyFieldValueFormatOptions } from './fieldValueFormat.ts'
import { pathToLabel } from './pathUtils.ts'
import type { GooSchemaData, GooSchemaField } from './types.ts'

// =============================================================================
// Types
// =============================================================================

/** Normalized select option with required id and label */
export interface NormalizedSelectOption {
	id: string
	label: string
	icon?: string
	tooltip?: string
	ariaLabel?: string
	hideLabel?: boolean
	className?: string
	disabled?: boolean
}

/** Controller options built from a schema field */
export interface ControllerOptions extends GooControllerOptions {
	[key: string]: unknown
	object: Record<string, unknown>
	property: string
	label: string
	type?: GooControllerOptions['type']
	controlTypes?: GooControlTypeRegistry
	min?: number
	max?: number
	step?: number
	coverage?: boolean
	preset?: GooControllerOptions['preset']
	presetColor?: string
	presetHue?: number
	shape?: GooControllerOptions['shape']
	dual?: boolean
	unit?: string
	options?: NormalizedSelectOption[]
	layout?: 'inline' | 'stacked'
	controlOptions?: GooControlOptionBag
}

// =============================================================================
// Type Detection
// =============================================================================

/**
 * Auto-detect control type from value and field configuration.
 *
 * Detection rules:
 * - If `options` provided → 'select'
 * - If boolean → 'checkbox'
 * - If `dual: true` → 'range-dual'
 * - If number with min/max → 'range' (slider)
 * - If number without bounds → 'number'
 * - If string matching color pattern → 'color'
 * - If string → 'text'
 *
 * @param value - The current value at the field's path
 * @param node - Field configuration
 * @returns Detected type or undefined to let controller decide
 */
export function detectFieldType(
	value: unknown,
	node: GooSchemaField
): GooSchemaField['type'] | undefined {
	// If options provided, it's a select
	if (node.options) return 'select'

	// Boolean = checkbox
	if (typeof value === 'boolean') return 'checkbox'

	// Dual-thumb slider when dual is specified
	if (node.dual) return 'range-dual'

	// Explicit 2D point control when requested by schema authors
	if (node.xy) return 'xy-pad'

	// 2D point control for {x, y} values
	if (value && typeof value === 'object' && !Array.isArray(value)
		&& typeof (value as { x?: number; y?: number }).x === 'number'
		&& typeof (value as { x?: number; y?: number }).y === 'number'
		&& Object.keys(value).length === 2) {
		return 'xy-pad'
	}

	// Number with min/max = range (maps to slider), otherwise number input
	if (typeof value === 'number') {
		if (node.min !== undefined && node.max !== undefined) return 'range'
		return 'number'
	}

	// String = text input (but check for color first)
	if (typeof value === 'string') {
		if (isColorString(value)) {
			return 'color'
		}
		return 'text'
	}

	// Let GooController figure it out
	return undefined
}

/**
 * Check if a string looks like a color value.
 * @param value - value.
 */
function isColorString(value: string): boolean {
	return (
		/^#[0-9a-f]{3,8}$/i.test(value) ||
		/^rgb/i.test(value) ||
		/^hsl/i.test(value)
	)
}

// =============================================================================
// Option Normalization
// =============================================================================

/**
 * Normalize select/button-group options to consistent format.
 * Strings are converted to { id: string, label: string } objects.
 *
 * @param options - Raw options array (strings or objects)
 * @returns Normalized options with id and label
 */
export function normalizeSelectOptions(
	options: NonNullable<GooSchemaField['options']>,
	data: GooSchemaData = {}
): NormalizedSelectOption[] {
	return options.filter(opt => (
		typeof opt === 'string'
		|| typeof opt === 'number'
		|| shouldRenderSchemaItem(opt, data)
	)).map(opt => {
		if (typeof opt === 'string' || typeof opt === 'number') {
			const value = String(opt)
			return { id: value, label: localizeSchemaText(value) ?? value }
		}

		const id = opt.id ?? opt.key ?? opt.value ?? opt.label ?? ''
		const label = opt.label ?? opt.value ?? opt.id ?? opt.key ?? ''
		return {
			id: String(id),
			label: localizeSchemaText(String(label)) ?? String(label),
			icon: opt.icon,
			tooltip: localizeSchemaText(opt.tooltip),
			ariaLabel: localizeSchemaText(opt.ariaLabel),
			hideLabel: opt.hideLabel,
			className: opt.className,
			disabled: opt.disabled
		}
	})
}

// =============================================================================
// Controller Options Building
// =============================================================================

/**
 * Build controller options from a schema field definition.
 *
 * This function:
 * - Auto-detects type from value if not specified
 * - Normalizes select options
 * - Maps field properties to controller options
 *
 * @param node - Schema field definition
 * @param object - Object containing the property
 * @param property - Property name on the object
 * @param value - Current value at the path
 * @returns Controller options ready for GooController
 */
export function buildControllerOptions(
	node: GooSchemaField,
	object: Record<string, unknown>,
	property: string,
	value: unknown,
	data: GooSchemaData = object
): ControllerOptions {
	const detectedType = node.type || detectFieldType(value, node)

	const options: ControllerOptions = {
		object,
		property,
		label: node.showLabel === false
			? ''
			: localizeSchemaText(node.label) || pathToLabel(node.path)
	}

	// Type (use detected type)
	if (detectedType) options.type = detectedType

	// Range options
	if (node.min !== undefined) options.min = node.min
	if (node.max !== undefined) options.max = node.max
	if (node.step !== undefined) options.step = node.step
	if (node.coverage) options.coverage = node.coverage
	if (node.preset) options.preset = node.preset
	if (node.presetColor) options.presetColor = node.presetColor
	if (node.presetHue !== undefined) options.presetHue = node.presetHue
	if (node.shape) options.shape = node.shape
	if (node.dual) options.dual = node.dual

	// Unit and value-display metadata
	if (node.unit) options.unit = node.unit
	const valueFormatOptions: Record<string, unknown> = { unit: options.unit }
	applyFieldValueFormatOptions(node, valueFormatOptions)
	if (typeof valueFormatOptions.unit === 'string') {
		options.unit = valueFormatOptions.unit
	}

	// Select options - normalize strings to { label, id } format
	if (node.options) {
		options.options = normalizeSelectOptions(node.options, data)
	}

	// Layout
	const layout = getControllerFieldLayout(node)
	if (layout) options.layout = layout
	if (node.disabled !== undefined) options.disabled = node.disabled

	let controlOptions: GooControlOptionBag | undefined = node.controlOptions ? { ...node.controlOptions } : undefined
	for (const [ key, value ] of [
		[ 'input', node.input ],
		[ 'canCross', node.canCross ],
		[ 'canPush', node.canPush ],
		[ 'xy', node.xy ],
		[ 'scale', node.scale ],
		[ 'mode', node.mode ],
		[ 'gradient', node.gradient ],
		[ 'marks', node.marks ],
		[ 'snap', node.snap ],
		[ 'valueBubble', node.valueBubble ],
		[ 'fullWidth', node.fullWidth ],
		[ 'modes', node.modes ],
		[ 'ariaLabel', localizeSchemaText(node.ariaLabel) ],
		[ 'class', node.class ],
		[ 'dataParam', node.dataParam ],
		[ 'id', node.id ],
		[ 'items', node.items ],
		[ 'popoutClass', node.popoutClass ],
		[ 'tabIndex', node.tabIndex ]
	] as const) {
		if (value !== undefined) {
			controlOptions ??= {}
			controlOptions[key] = value
		}
	}
	for (const [ key, value ] of Object.entries(valueFormatOptions)) {
		if (key !== 'unit' && value !== undefined) {
			controlOptions ??= {}
			controlOptions[key] = value as GooControlOptionBag[string]
		}
	}
	if (controlOptions && Object.keys(controlOptions).length) {
		options.controlOptions = controlOptions
	}

	return options
}
