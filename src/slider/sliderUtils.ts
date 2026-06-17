/**
 * @fileoverview Slider utility functions - Pure helpers for GooSlider.
 * @module goobits/slider/sliderUtils
 */

import { formatNumber } from '../support/utils/formatNumber.ts'
import { clamp, roundToStep } from '../support/utils/numberUtils.ts'
import type { GooSliderScale } from './types.ts'

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal slider state interface for utility functions.
 */
export interface GooSliderState {
	min: number
	max: number
	step: number
	unit: string
	direction: 'horizontal' | 'vertical'
	scale?: GooSliderScale
}

/** Normalized slider mark used for rendering and snapping. */
export type NormalizedSliderMark = {
	label?: string
	value: number
}

// ============================================================================
// Parsing Utilities
// ============================================================================

/**
 * Parse input into array of floats.
 * @param input - Value(s) to parse
 * @returns Array of parsed numbers
 */
export function parseFloatArray(input: number | string | number[] | null | undefined): number[] {
	if (input == null) return []
	if (typeof input === 'number') return [ input ]

	if (typeof input === 'string') {
		const parts = input.includes(',') ? input.split(',') : input.split(' ')
		return parts.map(v => Number.parseFloat(v))
	}

	return (input as number[]).map(v => Number.parseFloat(String(v)))
}

/**
 * Parse value as float with fallback default.
 * @param value - Value to parse
 * @param fallback - Default if invalid
 * @returns Parsed number or fallback
 */
export function parseFloatOr(value: number | string | null | undefined, fallback: number): number {
	if (Number.isFinite(value)) return value as number
	const parsed = Number.parseFloat(String(value))
	return isNaN(parsed) ? fallback : parsed
}

// ============================================================================
// Gradient Utilities
// ============================================================================

/**
 * Generate CSS gradient background string.
 * @param colors - Gradient color stops
 * @returns CSS background-image property value
 */
export function buildGradientCSS(colors: string[] | undefined): string {
	if (!colors || colors.length === 0) return ''

	const stops = colors.map((color, i) => {
		const pct = (i / (colors.length - 1)) * 100
		return `${ color } ${ pct }%`
	}).join(', ')

	return `background-image: linear-gradient(to right, ${ stops });`
}

// ============================================================================
// Value Formatting
// ============================================================================

/**
 * Convert percentage to formatted value.
 * @param value - Value or percent to format
 * @param isPercent - Whether value is 0-1 percent
 * @param state - Slider state with min/max/step/unit
 * @returns Formatted number
 */
export function toFormattedValue(value: number, isPercent: boolean, state: GooSliderState): number {
	if (isPercent) {
		value = fromScaledPercent(value, state.min, state.max, state.scale)
	}

	if (state.unit === 'float') {
		return roundToStep(value, state.step, state.min)
	}

	return formatNumber(value, state.unit, {
		appendFormatSuffix: false,
		max: state.max,
		min: state.min
	}) as number
}

/** Convert a value into a 0-1 track percentage for the selected scale. */
export function toScaledPercent(value: number, min: number, max: number, scale: GooSliderScale = 'linear'): number {
	if (max === min) return 0
	if (scale === 'log' && min > 0 && max > 0) {
		return clamp((Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min)), 0, 1)
	}
	if (scale === 'exponential') {
		return clamp(Math.sqrt((value - min) / (max - min)), 0, 1)
	}
	return clamp((value - min) / (max - min), 0, 1)
}

/** Convert a 0-1 track percentage into a value for the selected scale. */
export function fromScaledPercent(percent: number, min: number, max: number, scale: GooSliderScale = 'linear'): number {
	const pct = clamp(percent, 0, 1)
	if (scale === 'log' && min > 0 && max > 0) {
		return Math.exp(Math.log(min) + pct * (Math.log(max) - Math.log(min)))
	}
	if (scale === 'exponential') {
		return min + (pct ** 2) * (max - min)
	}
	return min + pct * (max - min)
}

/** Build track marks from slider ticks and explicit mark options. */
export function normalizeSliderMarks(
	ticks: boolean | number | undefined,
	marks: Array<number | NormalizedSliderMark> | undefined,
	min: number,
	max: number
): NormalizedSliderMark[] {
	const normalized = new Map<number, NormalizedSliderMark>()
	if (ticks) {
		const segments = typeof ticks === 'number' && Number.isFinite(ticks) ? Math.max(1, Math.floor(ticks)) : 10
		for (let index = 0; index <= segments; index++) {
			const value = min + (index / segments) * (max - min)
			normalized.set(value, { value })
		}
	}
	for (const mark of marks ?? []) {
		const nextMark = typeof mark === 'number' ? { value: mark } : mark
		if (Number.isFinite(nextMark.value)) normalized.set(nextMark.value, nextMark)
	}
	return [ ...normalized.values() ].sort((left, right) => left.value - right.value)
}

/** Snap a formatted value to explicit snap points or normalized track marks. */
export function snapSliderValue(
	value: number,
	snap: boolean | number[] | undefined,
	marks: NormalizedSliderMark[]
): number {
	if (!snap) return value
	const points = Array.isArray(snap)
		? snap.filter(Number.isFinite)
		: marks.map(mark => mark.value)
	if (!points.length) return value
	let best = points[0] ?? value
	let bestDistance = Math.abs(value - best)
	for (const point of points) {
		const distance = Math.abs(value - point)
		if (distance < bestDistance) {
			best = point
			bestDistance = distance
		}
	}
	return best
}

/** Return edge-compressed variance values around a base and radius. */
export function getEdgeCompressedVarianceValues(
	baseValue: number,
	radiusValue: number,
	min: number,
	max: number,
	formatValue: (value: number) => number = value => clamp(value, min, max)
): number[] {
	const rangeRadius = Math.max(0, max - min)
	const radius = Math.min(Math.max(0, radiusValue), rangeRadius)
	const base = formatValue(clamp(baseValue, min, max))
	return [
		formatValue(Math.max(min, base - radius)),
		base,
		formatValue(Math.min(max, base + radius))
	]
}

/** Read the persisted variance radius from possibly edge-compressed values. */
export function getVarianceRadius(values: number[], base: number): number {
	const low = values[0] ?? base
	const high = values[2] ?? base
	return Math.max(0, base - low, high - base)
}

/** Update `[low, base, high]` variance values with edge compression. */
export function getVarianceValues(
	sourceValues: number[],
	index: number,
	formatted: number,
	options: {
		formatValue?: (value: number) => number
		max: number
		min: number
	}
): number[] {
	if (sourceValues.length < 3) return sourceValues.slice()

	const currentBase = sourceValues[1] ?? options.min
	const currentRadius = getVarianceRadius(sourceValues, currentBase)
	const formatValue = options.formatValue
	if (index === 1) {
		return getEdgeCompressedVarianceValues(formatted, currentRadius, options.min, options.max, formatValue)
	}
	const sideRadius = index === 0
		? Math.max(0, currentBase - formatted)
		: Math.max(0, formatted - currentBase)
	return getEdgeCompressedVarianceValues(currentBase, sideRadius, options.min, options.max, formatValue)
}

/**
 * Get slider track length.
 * @param $track - Track element
 * @param direction - 'horizontal' or 'vertical'
 * @returns Track length in pixels
 */
export function getTrackLength($track: HTMLElement, direction: string): number {
	const rect = $track.getBoundingClientRect()
	return direction === 'vertical' ? (rect.height || 214) : (rect.width || 214)
}

/**
 * Position thumb by percentage with center alignment.
 * @param $thumb - Thumb element
 * @param pct - Percentage (0-1)
 */
export function setThumbPosition($thumb: HTMLElement, pct: number): void {
	$thumb.style.left = `${ pct * 100 }%`
	$thumb.style.transform = 'translateX(-50%) translateY(-50%)'
}
