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
	scalePower?: number
}

/** Normalized slider mark used for rendering and snapping. */
export type NormalizedSliderMark = {
	label?: string
	value: number
}

/** Options for constraining one thumb against neighboring thumbs. */
export type SliderConstrainedValueOptions = {
	canCross?: boolean
	canPush?: boolean
	formatValue: (value: number) => number
	maxDistance?: number
	min: number
	minDistance?: number
}

/** Options for deriving slider coverage fill styles. */
export type SliderCoverageStyleOptions = {
	coverage?: boolean
	direction: 'horizontal' | 'vertical'
	getDisplayPercent: (value: number) => number
	isVarianceMode?: boolean
	min: number
	values: number[]
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
	if (input === null || input === undefined) return []
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
		value = fromScaledPercent(
			value,
			state.min,
			state.max,
			state.scale,
			state.scalePower
		)
	}

	if (state.unit === 'float') {
		return roundToStep(value, state.step, state.min)
	}

	return formatNumber(value, state.unit, {
		appendFormatSuffix: false,
		max: state.max,
		min: state.min,
		step: state.step
	}) as number
}

/** Convert a value into a 0-1 track percentage for the selected scale. */
export function toScaledPercent(
	value: number,
	min: number,
	max: number,
	scale: GooSliderScale = 'linear',
	scalePower = 2
): number {
	if (max === min) return 0
	if (scale === 'log' && min > 0 && max > 0) {
		return clamp((Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min)), 0, 1)
	}
	if (scale === 'exponential') {
		return clamp(Math.sqrt((value - min) / (max - min)), 0, 1)
	}
	if (scale === 'power') {
		const normalized = clamp((value - min) / (max - min), 0, 1)
		return Math.pow(normalized, normalizeScalePower(scalePower))
	}
	return clamp((value - min) / (max - min), 0, 1)
}

/** Convert a 0-1 track percentage into a value for the selected scale. */
export function fromScaledPercent(
	percent: number,
	min: number,
	max: number,
	scale: GooSliderScale = 'linear',
	scalePower = 2
): number {
	const pct = clamp(percent, 0, 1)
	if (scale === 'log' && min > 0 && max > 0) {
		return Math.exp(Math.log(min) + pct * (Math.log(max) - Math.log(min)))
	}
	if (scale === 'exponential') {
		return min + (pct ** 2) * (max - min)
	}
	if (scale === 'power') {
		return min + Math.pow(pct, 1 / normalizeScalePower(scalePower)) * (max - min)
	}
	return min + pct * (max - min)
}

function normalizeScalePower(value: number): number {
	return Number.isFinite(value) && value > 0 ? value : 2
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

/** Apply crossing, push, and distance constraints to a thumb update. */
export function getConstrainedSliderValues(
	sourceValues: number[],
	index: number,
	formatted: number,
	options: SliderConstrainedValueOptions
): number[] {
	const values = sourceValues.slice()
	const canPushNeighbors = !options.canCross && options.canPush

	if (!options.canCross && !canPushNeighbors) {
		const next = values[index + 1]
		const previous = values[index - 1]
		if (next !== undefined && formatted > next) formatted = next
		if (previous !== undefined && formatted < previous) formatted = previous
	}

	values[index] = formatted
	applyDistanceConstraints(values, index, options)
	formatted = values[index] ?? formatted
	if (canPushNeighbors) {
		for (let previous = index - 1; previous >= 0; previous--) {
			if (values[previous] > formatted) values[previous] = formatted
		}
		for (let next = index + 1; next < values.length; next++) {
			if (values[next] < formatted) values[next] = formatted
		}
	}

	return values
}

function applyDistanceConstraints(values: number[], index: number, options: SliderConstrainedValueOptions): void {
	if (options.canCross || values.length < 2) return
	const minGap = Math.max(0, options.minDistance ?? 0)
	const maxGap = options.maxDistance ?? Number.POSITIVE_INFINITY
	const previous = values[index - 1]
	const next = values[index + 1]
	let nextValue = values[index] ?? options.min
	if (previous !== undefined) {
		nextValue = Math.max(nextValue, previous + minGap)
		if (Number.isFinite(maxGap)) nextValue = Math.min(nextValue, previous + maxGap)
	}
	if (next !== undefined) {
		nextValue = Math.min(nextValue, next - minGap)
		if (Number.isFinite(maxGap)) nextValue = Math.max(nextValue, next - maxGap)
	}
	values[index] = options.formatValue(nextValue)
}

/** Find the thumb nearest to a pointer percentage. */
export function getNearestSliderThumbIndex(
	values: number[],
	pointerPct: number,
	min: number,
	max: number,
	scale: GooSliderScale = 'linear',
	scalePower = 2
): number | null {
	if (!values.length) return null

	let nearestIndex = 0
	let nearestDistance = Number.MAX_SAFE_INTEGER
	for (let index = 0; index < values.length; index++) {
		const valuePct = toScaledPercent(values[index], min, max, scale, scalePower)
		const distance = Math.abs(pointerPct - valuePct)
		if (distance < nearestDistance) {
			nearestDistance = distance
			nearestIndex = index
		}
	}
	return nearestIndex
}

/** Convert a pointer coordinate into a clamped track percent. */
export function getSliderPointerPercent(
	coordinates: { clientX: number; clientY: number },
	rect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>,
	direction: 'horizontal' | 'vertical'
): number {
	if (direction === 'vertical') {
		return 1 - clamp((coordinates.clientY - rect.top) / (rect.height || 214), 0, 1)
	}
	return clamp((coordinates.clientX - rect.left) / (rect.width || 214), 0, 1)
}

/** Return the inline position style for a slider value. */
export function getSliderPositionStyle(
	value: number,
	direction: 'horizontal' | 'vertical',
	getDisplayPercent: (value: number) => number
): string {
	const pct = getDisplayPercent(value) * 100
	return direction === 'vertical' ? `bottom: ${ pct }%;` : `left: ${ pct }%;`
}

/** Return inline coverage styles for range, variance, and value-fill sliders. */
export function getSliderCoverageStyles({
	coverage,
	direction,
	getDisplayPercent,
	isVarianceMode,
	min,
	values
}: SliderCoverageStyleOptions): string[] {
	if (isVarianceMode && values.length >= 3) {
		return getRangeCoverageStyle(
			getDisplayPercent(values[0] ?? min),
			getDisplayPercent(values[2] ?? values[0] ?? min),
			direction
		)
	}
	if (values.length === 2) {
		return getRangeCoverageStyle(getDisplayPercent(values[0]), getDisplayPercent(values[1]), direction)
	}
	if (coverage) {
		const pct = getDisplayPercent(values[0] ?? min) * 100
		return direction === 'vertical' ? [ `bottom: 0; height: ${ pct }%;` ] : [ `left: 0; width: ${ pct }%;` ]
	}
	return []
}

function getRangeCoverageStyle(pct0: number, pct1: number, direction: 'horizontal' | 'vertical'): string[] {
	const left = Math.min(pct0, pct1) * 100
	const width = Math.abs(pct1 - pct0) * 100
	if (direction === 'vertical') {
		return [ `bottom: ${ left }%; height: ${ width }%;` ]
	}
	return [ `left: ${ left }%; width: ${ width }%;` ]
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
