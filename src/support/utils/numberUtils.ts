/**
 * @fileoverview Shared number utility functions for goo components.
 * @module goobits/utils/numberUtils
 */

// Inlined math utilities (no external deps)
export { clamp, roundNumber, roundToStep } from './math.ts'

/**
 * Convert a value to a percentage (0-1) within a range.
 * @param value - Current value
 * @param min - Range minimum
 * @param max - Range maximum
 * @returns Percentage (0-1)
 */
export function toPercent(value: number, min: number, max: number): number {
	return min === max ? 0 : (value - min) / (max - min)
}

/**
 * Convert a percentage (0-1) to a value within a range.
 * @param percent - Percentage (0-1)
 * @param min - Range minimum
 * @param max - Range maximum
 * @returns Value within range
 */
export function fromPercent(percent: number, min: number, max: number): number {
	return min + (max - min) * percent
}
