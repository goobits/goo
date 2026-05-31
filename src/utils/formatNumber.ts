/**
 * @fileoverview Number formatting utilities with unit support.
 * @module goobits/utils/formatNumber
 */

import { roundNumber } from './numberUtils.ts'

/**
 * Unit suffix map for display formatting.
 */
const suffixes: Record<string, string> = {
	'%': '%',
	'degree': String.fromCharCode(176), // °
	'em': 'em',
	'px': 'px',
	'rad': 'rad',
	'radian': 'rad',
	'x': 'x',

	// Points & Picas
	'pt': 'pt',
	'pc': 'pc',

	// Imperial
	'in': 'in',
	'ft': 'ft',
	'yd': 'yd',

	// Metric
	'mm': 'mm',
	'cm': 'cm',
	'm': 'm'
}

/**
 * Formats number options.
 */
export interface FormatNumberOptions {

	/** Maximum value for context-aware rounding */
	max?: number

	/** Minimum value for context-aware rounding */
	min?: number

	/** Step increment used to preserve editable precision */
	step?: number | 'any'

	/** Whether to append the unit suffix to the output */
	appendFormatSuffix?: boolean
}

/**
	 * Format a number to a specific unit format.
	 *
	 * @param value - The number to format
	 * @param unit - The unit type ('%', 'degree', 'px', 'float', 'int', etc.)
	 * @param options - Formatting options
	 * @returns Formatted number (with suffix if appendFormatSuffix is true)
	 *
	 * @example
	 * formatNumber(0.5, '%') // '50%'
	 * formatNumber(45, 'degree') // '45°'
	 * formatNumber(1.234, 'float') // 1.234
	 * formatNumber(1.5, 'int') // 2
	 * @param step - step.
	 * @param min - min.
	 * @param max - max.
	 * @param appendFormatSuffix - append format suffix.
	 */
export function formatNumber(
	value: number,
	unit: string,
	{
		appendFormatSuffix = true,
		max = Number.MAX_SAFE_INTEGER,
		min = Number.MIN_SAFE_INTEGER,
		step
	}: FormatNumberOptions = {}
): number | string {
	const formatted = convertToUnit(value, min, max, unit, appendFormatSuffix, step)

	if (appendFormatSuffix) {
		const suffix = suffixes[unit] || ''
		return formatted + suffix
	}

	return formatted
}

/**
 * Convert a number to the appropriate precision for a unit.
 * Returns string for cases where trailing zeros matter (e.g., "6.70" not "6.7").
 * @param value - value.
 * @param unit - unit.
 * @param step - step.
 * @param min - min.
 * @param max - max.
 * @param appendFormatSuffix - append format suffix.
 */
function convertToUnit(
	value: number,
	min: number,
	max: number,
	unit: string,
	appendFormatSuffix: boolean,
	step?: number | 'any'
): number | string {
	// Clamp to bounds
	value = Math.min(max, Math.max(min, value))
	const stepDecimals = getStepDecimalPlaces(step)

	switch (unit) {
		case '%':
			// Check if this is a 0-100 integer percentage or 0-1 float percentage
			if (min % 1.0 === 0 && max === 100) {
				return Math.round(value)
			}

			if (!appendFormatSuffix) return value
			return formatPercentage(value, stepDecimals)

		case 'float':
			return roundNumber(value, Math.max(3, stepDecimals))

		case 'int':
		case 'integer':
		case 'number':
			return Math.round(value)

		case 'px':
			if (stepDecimals > 0) return formatFixedNumber(value, stepDecimals)
			return Math.round(value)

		case 'in':
			return roundNumber(value, 2) // 2 decimal places

		case 'ft':
		case 'yd':
		case 'm':
			return roundNumber(value, 3) // 3 decimal places

		default: {
			if (stepDecimals > 0) {
				return value.toFixed(stepDecimals)
			}

			// For large numbers, round to integer
			const isLargeNumber = max >= 10 && value >= 10
			if (isLargeNumber) {
				return Math.round(value)
			}

			// Format to 2 decimal places with trailing zeros for consistent width
			return value.toFixed(2)
		}
	}
}

function formatPercentage(value: number, stepDecimals: number): number | string {
	const percentValue = value * 100
	const percentDecimals = Math.max(0, stepDecimals - 2)
	if (percentDecimals === 0) return Math.round(percentValue)
	return formatFixedNumber(percentValue, percentDecimals)
}

function formatFixedNumber(value: number, decimals: number): string {
	return value.toFixed(decimals).replace(/\.?0+$/, '')
}

function getStepDecimalPlaces(step: number | 'any' | undefined): number {
	if (typeof step !== 'number' || !Number.isFinite(step) || step <= 0) return 0

	const stepString = String(step)
	if (!stepString.includes('e')) return stepString.split('.')[1]?.length ?? 0

	const [ , exponent = '0' ] = stepString.split('e-')
	return Number.parseInt(exponent, 10) || 0
}
