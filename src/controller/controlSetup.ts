/**
 * @fileoverview controlSetup - Control type detection, options building, and dual-range handling.
 * Extracts setup logic from GooController for better separation of concerns.
 * @module goobits/controller/controlSetup
 */

import type { GooSelectMenuOptions } from '../select/types.ts'
import type { GooControlOptions, GooControlOptionValue as RegistryControlOptionValue } from './controlRegistry.ts'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for controller setup.
 */
/** Individual option in a select/button-group control */
export interface ControlOption {
	id?: string
	value?: string | number
	label?: string
	icon?: string
	key?: string
}

/** Valid option types for select/button-group controls */
export type GooControlOptionValue = string | ControlOption

export interface ControllerSetupOptions {
	type?: string
	min?: number | GooControlOptionValue[]
	max?: number
	step?: number
	options?: GooControlOptionValue[]
	unit?: string
	preset?: string
	presetColor?: string
	presetHue?: number
	coverage?: boolean
	showCoverage?: boolean
	label?: string
}

/**
 * Stored options from controller constructor.
 */
export interface StoredOptions {
	min?: number
	max?: number
	step?: number
	selectOptions?: GooControlOptionValue[]
	inputId?: string
	name?: string
	unit?: string
	preset?: string
	presetColor?: string
	presetHue?: number
	showCoverage?: boolean
	buttonLabel?: string
	controlOptions?: GooControlOptions
	menu?: GooSelectMenuOptions
	shape?: string
	layout?: 'inline' | 'stacked'
}

/**
 * Event data from dual-range slider.
 */
export interface DualRangeEventData {
	index: number
	value: number
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert camelCase/snake_case property names to human-readable labels.
 * "tipScaleY" → "Tip Scale Y"
 * "color0" → "Color 0"
 * @param name - name.
 */
export function humanizePropertyName(name: string): string {
	if (!name) return ''

	return name

		// Insert space before uppercase letters
		.replace(/([A-Z])/g, ' $1')

		// Insert space before numbers
		.replace(/(\d+)/g, ' $1')

		// Replace underscores/hyphens with spaces
		.replace(/[_-]/g, ' ')

		// Capitalize first letter
		.replace(/^./, s => s.toUpperCase())

		// Clean up multiple spaces
		.replace(/\s+/g, ' ')
		.trim()
}

// ============================================================================
// Control Type Detection
// ============================================================================

/**
 * Detect the appropriate control type based on value and options.
 * @param value - value.
 * @param options - options.
 */
export function detectControlType(value: unknown, options: ControllerSetupOptions): string {
	// Explicit type override
	if (options.type) return options.type

	// Function = button
	if (typeof value === 'function') return 'button'

	// Options with icons = button-group
	if (Array.isArray(options.options) && options.options.length > 0) {
		const firstOpt = options.options[0]
		if (typeof firstOpt === 'object' && (firstOpt.icon || firstOpt.key)) {
			return 'button-group'
		}
	}

	// Array of options = select
	if (options.options || Array.isArray(options.min)) return 'select'

	// Boolean = checkbox
	if (typeof value === 'boolean') return 'checkbox'

	// Dual-thumb range: array [min, max] or object {min, max}
	if (Array.isArray(value) && value.length === 2
		&& typeof value[0] === 'number' && typeof value[1] === 'number') {
		return 'range-dual'
	}
	if (value && typeof value === 'object' && !Array.isArray(value)
		&& typeof (value as { min?: number; max?: number }).min === 'number'
		&& typeof (value as { min?: number; max?: number }).max === 'number'
		&& Object.keys(value).length === 2) {
		return 'range-dual'
	}
	if (value && typeof value === 'object' && !Array.isArray(value)
		&& typeof (value as { x?: number; y?: number }).x === 'number'
		&& typeof (value as { x?: number; y?: number }).y === 'number'
		&& Object.keys(value).length === 2) {
		return 'xy-pad'
	}

	// Number with min/max = range, otherwise number input
	if (typeof value === 'number') {
		// Angle unit specified = angle control
		if (options.unit === 'degree' || options.unit === 'radian') {
			return 'angle'
		}
		if (options.min !== undefined && options.max !== undefined) {
			return 'range'
		}
		return 'number'
	}

	// Color string detection
	if (typeof value === 'string') {
		if (/^#[0-9a-f]{3,8}$/i.test(value) || /^rgb/i.test(value) || /^hsl/i.test(value)) {
			return 'color'
		}
	}

	// Default to text input
	return 'text'
}

// ============================================================================
// Options Building
// ============================================================================

/** Formatted option for select control */
export interface FormattedSelectOption {
	id: string
	label: string
}

/**
 * Format options for select control.
 * @param options - options.
 * @param _currentValue - current value.
 */
export function formatSelectOptions(options: GooControlOptionValue[] | undefined, _currentValue: unknown): FormattedSelectOption[] {
	if (!options) return []

	return options.map(opt => {
		if (typeof opt === 'string') {
			return { id: opt, label: opt }
		}
		return { id: opt.id ?? opt.value?.toString() ?? '', label: opt.label ?? opt.id ?? opt.value?.toString() ?? '' }
	})
}

/**
 * Build default options for a control based on stored options.
 * @param value - value.
 * @param stored - stored.
 * @param handlers - handlers.
 * @param controlType - control type.
 */
export function buildControlOptions(
	value: unknown,
	controlType: string,
	stored: StoredOptions,
	handlers: {
		onchange: (v: unknown) => void
		oninput: (v: unknown) => void
		onButtonClick?: () => void
	}
): GooControlOptions {
	const opts: GooControlOptions = {
		value: value as RegistryControlOptionValue,
		onchange: (v: unknown) => {
			const extractedValue = typeof v === 'object' && v !== null && 'value' in v
				? (v as { value: unknown }).value
				: v
			handlers.onchange(extractedValue)
		},
		oninput: (v: unknown) => {
			const extractedValue = typeof v === 'object' && v !== null && 'value' in v
				? (v as { value: unknown }).value
				: v
			handlers.oninput(extractedValue)
		}
	}

	// Add numeric options
	if (stored.min !== undefined) opts.min = stored.min
	if (stored.max !== undefined) opts.max = stored.max
	if (stored.step !== undefined) opts.step = stored.step
	if (stored.inputId) opts.inputId = stored.inputId
	if (stored.name) opts.name = stored.name
	if (stored.buttonLabel) opts.label = stored.buttonLabel
	if (stored.controlOptions) Object.assign(opts, stored.controlOptions)

	// Add range-specific options
	if (stored.preset) opts.preset = stored.preset
	if (stored.presetColor) opts.presetColor = stored.presetColor
	if (stored.presetHue !== undefined) opts.presetHue = stored.presetHue
	if (stored.showCoverage) opts.coverage = stored.showCoverage
	if (stored.shape) opts.shape = stored.shape

	// Add unit for angle
	if (stored.unit) opts.unit = stored.unit

	// Add select options
	if (stored.selectOptions) {
		opts.options = formatSelectOptions(stored.selectOptions, value)
	}

	// For button type, use label as value and pass onClick
	if (controlType === 'button') {
		opts.value = stored.buttonLabel
		opts.onClick = handlers.onButtonClick
		delete opts.onchange
		delete opts.oninput
	}

	return opts
}

/**
 * Get all stored options for passing to custom buildOptions.
 * @param stored - stored.
 */
export function getAllOptions(stored: StoredOptions): GooControlOptions {
	return {
		...stored.controlOptions,
		min: stored.min,
		max: stored.max,
		step: stored.step,
		options: stored.selectOptions,
		menu: stored.menu,
		preset: stored.preset,
		presetColor: stored.presetColor,
		presetHue: stored.presetHue,
		coverage: stored.showCoverage,
		unit: stored.unit,
		label: stored.buttonLabel,
		shape: stored.shape,
		layout: stored.layout
	}
}

// ============================================================================
// Dual Range Handling
// ============================================================================

/**
 * Options for creating a dual-range slider.
 */
export interface DualRangeOptions {
	value: number[] | { min: number; max: number }
	min?: number
	max?: number
	step?: number
	preset?: string
	presetColor?: string
	presetHue?: number
	onchange: (eventData: DualRangeEventData) => void
	oninput: (eventData: DualRangeEventData) => void
}

/**
 * Create dual-range slider options.
 * Returns options ready to pass to the slider field factory.
 * @param value - value.
 * @param stored - stored.
 * @param handlers - handlers.
 */
export function buildDualRangeOptions(
	value: number[] | { min: number; max: number },
	stored: StoredOptions,
	handlers: {
		onchange: (eventData: DualRangeEventData) => void
		oninput: (eventData: DualRangeEventData) => void
	}
): { sliderOptions: GooControlOptions; isMinMaxFormat: boolean } {
	// Detect if value is array [a, b] or object {min, max}
	const isMinMaxFormat = !Array.isArray(value)
	const minMaxValue = value as { min: number; max: number }
	const arrayValue = isMinMaxFormat ? [ minMaxValue.min, minMaxValue.max ] : value

	const sliderOptions: GooControlOptions = {
		value: arrayValue as RegistryControlOptionValue,
		min: stored.min ?? 0,
		max: stored.max ?? 100,
		step: stored.step,
		preset: stored.preset,
		presetColor: stored.presetColor,
		presetHue: stored.presetHue,
		onchange: handlers.onchange,
		oninput: handlers.oninput
	}

	return { sliderOptions, isMinMaxFormat }
}

/** Dual range target as an object with min/max properties */
export interface DualRangeMinMax {
	min: number
	max: number
}

/** Valid target types for dual-range updates */
export type DualRangeTarget = number[] | DualRangeMinMax | null | undefined

/**
 * Handle dual-range value change/input.
 * Updates the target object and returns the value to emit.
 * @param target - target.
 * @param isMinMaxFormat - is min max format.
 * @param eventData - event data.
 */
export function handleDualRangeUpdate(
	eventData: DualRangeEventData,
	target: DualRangeTarget,
	isMinMaxFormat: boolean
): number[] | DualRangeMinMax {
	const { index, value } = eventData

	if (isMinMaxFormat) {
		if (target && typeof target === 'object' && !Array.isArray(target)) {
			target[index === 0 ? 'min' : 'max'] = value
		}
		const minMaxTarget = target as DualRangeMinMax | null | undefined
		return { min: minMaxTarget?.min ?? 0, max: minMaxTarget?.max ?? 0 }
	} else {
		if (Array.isArray(target)) {
			target[index] = value
		}
		return target && Array.isArray(target) ? target.slice() : [ value ]
	}
}
