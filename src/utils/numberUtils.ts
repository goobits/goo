/**
 * @fileoverview Shared number utility functions for goo components.
 * @module goobits/utils/numberUtils
 */

// Inlined math utilities (no external deps)
export { clamp, inverseLerp, lerp, roundNumber, roundToStep } from './math.js'

import { inverseLerp, lerp } from './math.js'

/**
 * Convert a value to a percentage (0-1) within a range.
 * Alias for inverseLerp.
 * @param value - Current value
 * @param min - Range minimum
 * @param max - Range maximum
 * @returns Percentage (0-1)
 */
export function toPercent(value: number, min: number, max: number): number {
	return inverseLerp(min, max, value)
}

/**
 * Convert a percentage (0-1) to a value within a range.
 * Alias for lerp.
 * @param percent - Percentage (0-1)
 * @param min - Range minimum
 * @param max - Range maximum
 * @returns Value within range
 */
export function fromPercent(percent: number, min: number, max: number): number {
	return lerp(min, max, percent)
}
