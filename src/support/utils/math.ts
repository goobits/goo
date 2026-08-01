/**
 * @fileoverview Math utilities for goo components.
 * Inlined to keep @goobits/goo independent from application utility packages.
 * @module goo/utils/math
 */

/**
 * Clamp a value between min and max.
 * @param value - value.
 * @param min - min.
 * @param max - max.
 */
export const clamp = (value: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, value))

/**
 * Round a number to a specified number of decimal places.
 * @param n - Number to round
 * @param decimals - Number of decimal places (default 0)
 */
export const roundNumber = (n: number, decimals = 0): number => {
	const factor = 10 ** decimals
	return Math.round(n * factor) / factor
}

/**
 * Round a number to the nearest step increment from an optional base.
 * @param value - Number to round
 * @param step - Step increment
 * @param base - Step origin
 */
export const roundToStep = (value: number | string, step: number | string = 1, base: number | string = 0): number => {
	const numericValue = Number(value)
	const numericStep = Number(step)
	const numericBase = Number(base)
	const safeValue = Number.isFinite(numericValue) ? numericValue : 0
	const safeBase = Number.isFinite(numericBase) ? numericBase : 0

	if (!Number.isFinite(numericStep) || numericStep <= 0) return safeValue

	const rounded = safeBase + Math.round((safeValue - safeBase) / numericStep) * numericStep
	const precision = Math.max(0, String(numericStep).split('.')[1]?.length ?? 0)
	return Number(rounded.toFixed(Math.min(12, precision + 2)))
}
