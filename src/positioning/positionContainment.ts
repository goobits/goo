/**
 * @fileoverview Position containment and smart flipping logic.
 * Handles viewport constraints and automatic repositioning.
 * @module goo/positioning/positionContainment
 */

import { clamp } from '../utils/numberUtils.js'
import { HORIZONTAL } from './direction.js'
import type { AlignmentConfig, PositionResult } from './types.js'

// =============================================================================
// Types
// =============================================================================

/** Rectangle with position and dimensions */
export interface Rect {
	x: number
	y: number
	width: number
	height: number
}

/** Containment configuration */
export interface ContainmentConfig {
	$element?: HTMLElement
	margin?: number
}

/** Callback to recalculate position with flipped alignment */
export type RecalculatePositionFn = (flippedAlign: AlignmentConfig) => PositionResult

// =============================================================================
// Edge Utilities
// =============================================================================

const EDGE_OPPOSITE: Record<string, string> = {
	top: 'bottom',
	bottom: 'top',
	left: 'right',
	right: 'left'
}

/**
 * Get the opposite edge.
 * @param edge - Edge identifier ('top', 'bottom', 'left', 'right')
 * @returns Opposite edge
 */
export function getOppositeEdge(edge: string): string {
	return EDGE_OPPOSITE[edge] || edge
}

// =============================================================================
// Containment Logic
// =============================================================================

/**
 * Apply containment constraints and flip position if necessary.
 *
 * When an element would overflow its container, this function:
 * 1. Checks if flipping to the opposite edge would fit better
 * 2. Applies the flip if it results in a better fit
 * 3. Clamps the final position to container bounds
 * 4. Calculates max width/height constraints
 *
 * @param result - Initial position result
 * @param popoutRect - Popout element dimensions
 * @param targetRect - Target element dimensions
 * @param align - Current alignment configuration (may be mutated on flip)
 * @param offset - Position offset
 * @param keepWithin - Containment configuration
 * @param direction - HORIZONTAL (0) or VERTICAL (1)
 * @param recalculatePosition - Callback to recalculate position with new alignment
 * @returns Constrained position result
 */
export function applyContainment(
	result: PositionResult,
	popoutRect: Rect,
	targetRect: Rect,
	align: AlignmentConfig,
	offset: { x?: number; y?: number },
	keepWithin: ContainmentConfig,
	direction: number,
	recalculatePosition: RecalculatePositionFn
): PositionResult {
	const container = keepWithin.$element
	if (!container) return result

	const margin = keepWithin.margin ?? 15
	const containerRect = container.getBoundingClientRect()

	// Calculate bounds
	const bounds = calculateBounds(containerRect, popoutRect, margin)

	// Check if we need to flip
	const flipNeeded = checkFlipNeeded(result, align, bounds, direction)

	// Perform flip if needed
	if (flipNeeded.x || flipNeeded.y) {
		result = attemptFlip(
			result,
			align,
			bounds,
			direction,
			flipNeeded,
			recalculatePosition
		)
	}

	// Clamp to bounds
	result.x = clamp(result.x, bounds.minX, bounds.maxX)
	result.y = clamp(result.y, bounds.minY, bounds.maxY)

	// Set max dimensions
	result.maxWidth = containerRect.width - margin * 2
	result.maxHeight = containerRect.height - margin * 2

	return result
}

// =============================================================================
// Internal Helpers
// =============================================================================

interface Bounds {
	minX: number
	maxX: number
	minY: number
	maxY: number
}

/**
 * Calculate containment bounds from container rect.
 */
function calculateBounds(
	containerRect: DOMRect,
	popoutRect: Rect,
	margin: number
): Bounds {
	return {
		minX: containerRect.left + margin,
		maxX: containerRect.right - margin - popoutRect.width,
		minY: containerRect.top + margin,
		maxY: containerRect.bottom - margin - popoutRect.height
	}
}

/**
 * Check if position needs to be flipped on either axis.
 */
function checkFlipNeeded(
	result: PositionResult,
	align: AlignmentConfig,
	bounds: Bounds,
	direction: number
): { x: boolean; y: boolean } {
	let needsFlipX = false
	let needsFlipY = false

	if (direction === HORIZONTAL) {
		if (align.edge === 'right' && result.x < bounds.minX) needsFlipX = true
		if (align.edge === 'left' && result.x > bounds.maxX) needsFlipX = true
	} else {
		if (align.edge === 'bottom' && result.y < bounds.minY) needsFlipY = true
		if (align.edge === 'top' && result.y > bounds.maxY) needsFlipY = true
	}

	return { x: needsFlipX, y: needsFlipY }
}

/**
 * Attempt to flip position and use it if it fits better.
 */
function attemptFlip(
	result: PositionResult,
	align: AlignmentConfig,
	bounds: Bounds,
	direction: number,
	flipNeeded: { x: boolean; y: boolean },
	recalculatePosition: RecalculatePositionFn
): PositionResult {
	// Create flipped alignment. checkFlipNeeded only flags the axis that matches
	// `direction`, so a single inversion of the edges covers both cases.
	const flippedAlign = { ...align }

	if (flipNeeded.x || flipNeeded.y) {
		flippedAlign.edge = getOppositeEdge(align.edge)
		flippedAlign.toEdge = getOppositeEdge(align.toEdge)
	}

	// Recalculate with flipped alignment
	const flippedResult = recalculatePosition(flippedAlign)

	// Check if flipped position fits better
	const flippedFits = (direction === HORIZONTAL)
		? (flippedResult.x >= bounds.minX && flippedResult.x <= bounds.maxX)
		: (flippedResult.y >= bounds.minY && flippedResult.y <= bounds.maxY)

	if (flippedFits) {
		result = flippedResult
		result.flippedX = flipNeeded.x
		result.flippedY = flipNeeded.y

		// Update align reference for arrow calculation
		align.edge = flippedAlign.edge
		align.toEdge = flippedAlign.toEdge
	}

	return result
}
