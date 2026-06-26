/**
 * @fileoverview Position containment and smart flipping logic.
 * Handles viewport constraints and automatic repositioning.
 * @module goo/positioning/positionContainment
 */

import { clamp } from '../utils/numberUtils.ts'
import { HORIZONTAL } from './direction.ts'
import type { AlignmentConfig, PositionAvoidRect, PositionResult } from './types.ts'

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
	_targetRect: Rect,
	align: AlignmentConfig,
	_offset: { x?: number; y?: number },
	keepWithin: ContainmentConfig,
	direction: number,
	recalculatePosition: RecalculatePositionFn,
	avoidRects: PositionAvoidRect[] = [],
	avoidMargin = 0
): PositionResult {
	const container = keepWithin.$element
	if (!container) return result

	const margin = keepWithin.margin ?? 15
	const containerRect = getContainmentRect(container)

	// Calculate bounds
	const bounds = calculateBounds(containerRect, popoutRect, margin)

	// Check if we need to flip
	const flipNeeded = checkFlipNeeded(result, align, bounds, direction)

	// Perform flip if needed
	if (flipNeeded.x || flipNeeded.y) {
		result = attemptFlip(result, align, bounds, direction, flipNeeded, recalculatePosition)
	}

	// Clamp to bounds
	result.x = clamp(result.x, bounds.minX, bounds.maxX)
	result.y = clamp(result.y, bounds.minY, bounds.maxY)
	result = avoidOverlappingRects(result, popoutRect, bounds, avoidRects, avoidMargin)

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

type AvoidCandidate = {
	distance: number
	overlap: number
	x: number
	y: number
}

/**
 * Calculate containment bounds from container rect.
 * @param popoutRect - popout rect.
 * @param margin - margin.
 * @param containerRect - container rect.
 */
type ContainmentRect = Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width' | 'x' | 'y'>

function getContainmentRect(container: HTMLElement): ContainmentRect {
	const containerRect = container.getBoundingClientRect()
	if (!isDocumentContainmentElement(container) || isUsableContainmentRect(containerRect)) {
		return containerRect
	}

	const ownerDocument = container.ownerDocument
	const viewport = ownerDocument.defaultView
	const documentElement = ownerDocument.documentElement
	const body = ownerDocument.body
	const width = Math.max(
		viewport?.innerWidth ?? 0,
		documentElement.clientWidth,
		body?.clientWidth ?? 0
	)
	const height = Math.max(
		viewport?.innerHeight ?? 0,
		documentElement.clientHeight,
		body?.clientHeight ?? 0
	)

	return {
		bottom: height,
		height,
		left: 0,
		right: width,
		top: 0,
		width,
		x: 0,
		y: 0
	}
}

function isDocumentContainmentElement(container: HTMLElement): boolean {
	const ownerDocument = container.ownerDocument
	return container === ownerDocument.documentElement || container === ownerDocument.body
}

function isUsableContainmentRect(rect: DOMRect): boolean {
	return rect.width > 0 && rect.height > 0
}

function calculateBounds(containerRect: ContainmentRect, popoutRect: Rect, margin: number): Bounds {
	return {
		minX: containerRect.left + margin,
		maxX: containerRect.right - margin - popoutRect.width,
		minY: containerRect.top + margin,
		maxY: containerRect.bottom - margin - popoutRect.height
	}
}

/**
 * Check if position needs to be flipped on either axis.
 * @param result - result.
 * @param direction - direction.
 * @param bounds - bounds.
 * @param align - align.
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
 * @param result - result.
 * @param recalculatePosition - recalculate position.
 * @param flipNeeded - flip needed.
 * @param direction - direction.
 * @param bounds - bounds.
 * @param align - align.
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
	const flippedFits =
		direction === HORIZONTAL
			? flippedResult.x >= bounds.minX && flippedResult.x <= bounds.maxX
			: flippedResult.y >= bounds.minY && flippedResult.y <= bounds.maxY

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

function avoidOverlappingRects(
	result: PositionResult,
	popoutRect: Rect,
	bounds: Bounds,
	avoidRects: PositionAvoidRect[],
	avoidMargin: number
): PositionResult {
	let nextResult = result
	for (const avoidRect of avoidRects) {
		const expandedRect = expandAvoidRect(avoidRect, avoidMargin)
		if (!rectsIntersect(toPositionRect(nextResult, popoutRect), expandedRect)) {
			continue
		}

		nextResult = {
			...nextResult,
			...chooseAvoidancePosition(nextResult, popoutRect, bounds, expandedRect)
		}
	}

	return nextResult
}

function chooseAvoidancePosition(
	result: PositionResult,
	popoutRect: Rect,
	bounds: Bounds,
	avoidRect: PositionAvoidRect
): { x: number; y: number } {
	const base = { x: result.x, y: result.y }
	const candidates = [
		{ x: avoidRect.left - popoutRect.width, y: result.y },
		{ x: avoidRect.right, y: result.y },
		{ x: result.x, y: avoidRect.top - popoutRect.height },
		{ x: result.x, y: avoidRect.bottom }
	].map((candidate) => scoreAvoidCandidate(candidate, base, popoutRect, bounds, avoidRect))

	return candidates.reduce((best, next) => {
		if (next.overlap !== best.overlap) return next.overlap < best.overlap ? next : best
		return next.distance < best.distance ? next : best
	}, candidates[0])
}

function scoreAvoidCandidate(
	candidate: { x: number; y: number },
	base: { x: number; y: number },
	popoutRect: Rect,
	bounds: Bounds,
	avoidRect: PositionAvoidRect
): AvoidCandidate {
	const x = clamp(candidate.x, bounds.minX, bounds.maxX)
	const y = clamp(candidate.y, bounds.minY, bounds.maxY)
	return {
		distance: Math.abs(x - base.x) + Math.abs(y - base.y),
		overlap: getOverlapArea(toRect(x, y, popoutRect), avoidRect),
		x,
		y
	}
}

function expandAvoidRect(rect: PositionAvoidRect, margin: number): PositionAvoidRect {
	return {
		bottom: rect.bottom + margin,
		left: rect.left - margin,
		right: rect.right + margin,
		top: rect.top - margin
	}
}

function toPositionRect(position: PositionResult, popoutRect: Rect): PositionAvoidRect {
	return toRect(position.x, position.y, popoutRect)
}

function toRect(x: number, y: number, popoutRect: Rect): PositionAvoidRect {
	return {
		bottom: y + popoutRect.height,
		left: x,
		right: x + popoutRect.width,
		top: y
	}
}

function rectsIntersect(a: PositionAvoidRect, b: PositionAvoidRect): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function getOverlapArea(a: PositionAvoidRect, b: PositionAvoidRect): number {
	const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
	const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
	return width * height
}
