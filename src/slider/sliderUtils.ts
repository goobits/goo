/**
 * @fileoverview Slider utility functions - Pure helpers for GooSlider.
 * @module goobits/slider/sliderUtils
 */

import { formatNumber } from '../utils/formatNumber.js'
import { roundToStep } from '../utils/numberUtils.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Thumb object representing a draggable handle.
 */
export interface GooSliderThumb {
	element: HTMLElement
	index: number
	left: number
	value: number
}

/**
 * Minimal slider state interface for utility functions.
 */
export interface GooSliderState {
	min: number
	max: number
	step: number
	unit: string
	direction: 'horizontal' | 'vertical'
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
		value = value * (state.max - state.min) + state.min
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
