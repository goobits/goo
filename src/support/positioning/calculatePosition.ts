/**
 * @fileoverview Core positioning logic for elements.
 * Calculates positions with support for alignment, containment, and flipping.
 * @module goo/positioning/calculatePosition
 */

import { HORIZONTAL, VERTICAL } from './direction.ts'
import { applyContainment, getOppositeEdge, type Rect } from './positionContainment.ts'
import type { AlignmentConfig, PositionOptions, PositionResult } from './types.ts'

const PERCENT_MAP: Record<string, number> = {
	top: 0,
	left: 0,
	center: 0.5,
	bottom: 1,
	right: 1
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Calculate position for a popout element relative to a target element or point.
 * @param $popout - The popout element to position
 * @param options - Positioning configuration
 * @returns Calculated position result
 */
export function calculatePosition(
	$popout: HTMLElement,
	options: PositionOptions = {}
): PositionResult {
	const {
		element: $target,
		x: pointX,
		y: pointY,
		align: alignInput = 'left to right',
		offset = { x: 15, y: 15 },
		keepWithin,
		avoidRects,
		avoidMargin,
		rtl = false
	} = options

	// Parse alignment
	const align = parseAlignment(alignInput, rtl)
	const direction = getDirection(align)

	// Get measurements
	const popoutRect = measureElement($popout)
	const targetRect = $target
		? measureElement($target)
		: { x: pointX ?? 0, y: pointY ?? 0, width: 0, height: 0 }

	// Calculate initial position
	let result: PositionResult = calculateInitialPosition(
		popoutRect,
		targetRect,
		align,
		offset,
		direction
	)

	// Handle containment and flipping
	if (keepWithin?.$element) {
		result = applyContainment(
			result,
			popoutRect,
			targetRect,
			align,
			offset,
			keepWithin,
			direction,
			flippedAlign =>
				calculateInitialPosition(popoutRect, targetRect, flippedAlign, offset, direction),
			avoidRects,
			avoidMargin
		)
	}

	// Calculate arrow position from the final placed rectangle. Containment and
	// avoid-rect handling can move a popout to a different side than requested.
	const arrowPosition = getFinalArrowPosition(targetRect, popoutRect, result, getArrowPosition(align, direction))
	const arrowDirection = getArrowDirection(arrowPosition)
	result.direction = arrowDirection
	result.arrowPosition = arrowPosition
	result.arrowOffset = calculateArrowOffset(targetRect, result, arrowDirection)

	return result
}

/**
 * Apply calculated position to a popout element.
 * @param $popout - The popout element
 * @param position - Calculated position
 */
export function applyPosition($popout: HTMLElement, position: PositionResult): void {
	const style = $popout.style
	style.left = `${ position.x }px`
	style.top = `${ position.y }px`

	if (position.maxWidth) {
		style.maxWidth = `${ position.maxWidth }px`
	}
	if (position.maxHeight) {
		style.maxHeight = `${ position.maxHeight }px`
	}
}

/**
 * Position and update arrow element.
 * @param $arrow - The arrow element
 * @param position - Calculated position
 */
export function applyArrowPosition($arrow: HTMLElement | null, position: PositionResult): void {
	if (!$arrow) return

	// Reset classes
	$arrow.classList.remove('top', 'bottom', 'left', 'right')

	// Add position class
	if (position.arrowPosition) {
		$arrow.classList.add(position.arrowPosition)
	}

	// Arrow is a CSS border triangle - the visual tip is offset from the element's position
	// by the arrow size (border width). We need to subtract this to center the visual tip.
	const arrowSize = 9 // --goo-popout-arrow-size (8px) + 1px border

	// Set offset
	if (position.direction === HORIZONTAL) {
		$arrow.style.top = `${ Math.max(8, (position.arrowOffset ?? 0) - arrowSize) }px`
		$arrow.style.left = ''
	} else {
		$arrow.style.left = `${ Math.max(8, (position.arrowOffset ?? 0) - arrowSize) }px`
		$arrow.style.top = ''
	}
}

// getOppositeEdge is re-exported from positionContainment.
export { getOppositeEdge } from './positionContainment.ts'

// =============================================================================
// Alignment Parsing
// =============================================================================

/**
 * Check if a value is an edge (top, bottom, left, right).
 * @param value - value.
 * @returns True if value is an edge
 */
function isEdge(value: string): boolean {
	return value === 'top' || value === 'bottom' || value === 'left' || value === 'right'
}

/**
 * Normalize edge/position pair - swap if in wrong order.
 * Expected order: [edge] [position], but we also accept [position] [edge]
 * @param first - first.
 * @param second - second.
 * @returns Normalized edge and position
 */
function normalizeEdgePosition(first: string, second: string): { edge: string; position: string } {
	// If first is 'center' and second is an edge, swap them
	if (first === 'center' && isEdge(second)) {
		return { edge: second, position: first }
	}

	// If second is 'center' and first is an edge, keep order
	if (isEdge(first)) {
		return { edge: first, position: second || 'center' }
	}

	// Default: treat first as edge
	return { edge: first || 'left', position: second || 'center' }
}

/**
 * Parse alignment string into structured format.
 * Supports formats like: 'left to right', 'bottom center to top center', 'center bottom to center top'
 * @param align - Alignment input (string or AlignmentConfig)
 * @param rtl - Right-to-left mode
 * @returns Parsed alignment configuration
 */
export function parseAlignment(align: string | AlignmentConfig, rtl = false): AlignmentConfig {
	if (typeof align === 'object') {
		return { ...align }
	}

	// Handle 'X to Y' format
	let parts: string[]
	if (align.includes(' to ')) {
		parts = align.replace(' to ', ' ').split(' ')
	} else {
		parts = align.split(' ')
	}

	// Expand short form: 'left to right' -> ['left', 'center', 'right', 'center']
	if (parts.length === 2) {
		parts = [ parts[0], 'center', parts[1], 'center' ]
	}

	// Normalize edge/position pairs (handles both 'edge position' and 'position edge' formats)
	const source = normalizeEdgePosition(parts[0], parts[1])
	const target = normalizeEdgePosition(parts[2], parts[3])

	let edge = source.edge
	let position = source.position
	let toEdge = target.edge || getOppositeEdge(edge)
	let toPosition = target.position

	// Handle RTL
	if (rtl) {
		edge = flipHorizontal(edge)
		toEdge = flipHorizontal(toEdge)
		if (isHorizontal(position)) position = flipHorizontal(position)
		if (isHorizontal(toPosition)) toPosition = flipHorizontal(toPosition)
	}

	return { edge, position, toEdge, toPosition }
}

// =============================================================================
// Direction Detection
// =============================================================================

/**
 * Determine if alignment is horizontal or vertical.
 * @param align - Alignment configuration
 * @returns HORIZONTAL or VERTICAL
 */
function getDirection(align: AlignmentConfig): number {
	const { edge, position, toEdge, toPosition } = align

	if (
		isHorizontal(edge) ||
    isHorizontal(toEdge) ||
    isVertical(position) ||
    isVertical(toPosition)
	) {
		return HORIZONTAL
	}

	if (
		isVertical(edge) ||
    isVertical(toEdge) ||
    isHorizontal(position) ||
    isHorizontal(toPosition)
	) {
		return VERTICAL
	}

	return HORIZONTAL
}

function isHorizontal(value: string): boolean {
	return value === 'left' || value === 'right'
}

function isVertical(value: string): boolean {
	return value === 'top' || value === 'bottom'
}

function flipHorizontal(value: string): string {
	if (value === 'left') return 'right'
	if (value === 'right') return 'left'
	return value
}

// =============================================================================
// Position Calculation
// =============================================================================

/**
 * Calculate initial position before containment.
 * @param popoutRect - Popout dimensions
 * @param targetRect - Target dimensions and position
 * @param align - Alignment configuration
 * @param offset - Position offset
 * @param direction - HORIZONTAL or VERTICAL
 * @returns Initial position result
 */
function calculateInitialPosition(
	popoutRect: Rect,
	targetRect: Rect,
	align: AlignmentConfig,
	offset: { x?: number; y?: number },
	direction: number
): PositionResult {
	const { edge, position, toEdge, toPosition } = align

	// Get target point (where popout should point to)
	const targetPoint = getPointOnRect(targetRect, toEdge, toPosition, direction)

	// Get popout anchor point (where popout connects)
	const popoutAnchor = getPointOnRect(
		{ x: 0, y: 0, width: popoutRect.width, height: popoutRect.height },
		edge,
		position,
		direction
	)

	// Calculate offset based on direction and edges
	const appliedOffset = calculateOffset(offset, edge, position, toPosition, direction)

	return {
		x: targetPoint.x + appliedOffset.x - popoutAnchor.x,
		y: targetPoint.y + appliedOffset.y - popoutAnchor.y,
		direction,
		flippedX: false,
		flippedY: false
	}
}

/**
 * Get a point on a rectangle based on edge and position.
 * @param rect - Rectangle with x, y, width, height
 * @param edge - Edge identifier
 * @param position - Position identifier
 * @param direction - HORIZONTAL or VERTICAL
 * @returns Point coordinates
 */
function getPointOnRect(
	rect: Rect,
	edge: string,
	position: string,
	direction: number
): { x: number; y: number } {
	const x = rect.x || 0
	const y = rect.y || 0
	const w = rect.width || 0
	const h = rect.height || 0

	const edgePercent = PERCENT_MAP[edge] ?? 0
	const posPercent = PERCENT_MAP[position] ?? 0.5

	if (direction === HORIZONTAL) {
		return {
			x: x + w * edgePercent,
			y: y + h * posPercent
		}
	} else {
		return {
			x: x + w * posPercent,
			y: y + h * edgePercent
		}
	}
}

/**
 * Calculate offset based on alignment direction.
 * @param offset - Raw offset {x, y}
 * @param edge - Source edge
 * @param position - Source position
 * @param toPosition - Target position
 * @param direction - HORIZONTAL or VERTICAL
 * @returns Applied offset
 */
function calculateOffset(
	offset: { x?: number; y?: number },
	edge: string,
	position: string,
	toPosition: string,
	direction: number
): { x: number; y: number } {
	const ox = offset.x || 0
	const oy = offset.y || 0

	if (direction === HORIZONTAL) {
		// Horizontal: offset.x pushes away from edge, offset.y adjusts along edge
		const xMult = edge === 'right' ? -1 : 1
		let yOffset = 0
		if (position === 'top' && toPosition === 'bottom') yOffset = -oy
		else if (position === 'bottom' && toPosition === 'top') yOffset = oy

		return { x: ox * xMult, y: yOffset }
	} else {
		// Vertical: offset.y pushes away from edge, offset.x adjusts along edge
		const yMult = edge === 'bottom' ? -1 : 1
		let xOffset = 0
		if (position === 'left' && toPosition === 'right') xOffset = -ox
		else if (position === 'right' && toPosition === 'left') xOffset = ox

		return { x: xOffset, y: oy * yMult }
	}
}

// =============================================================================
// Arrow Positioning
// =============================================================================

/**
 * Get arrow position class based on alignment.
 * @param align - Alignment configuration
 * @param direction - HORIZONTAL or VERTICAL
 * @returns Arrow position class ('left', 'right', 'top', 'bottom')
 */
function getArrowPosition(align: AlignmentConfig, direction: number): string {
	if (direction === HORIZONTAL) {
		return align.edge === 'left' ? 'left' : 'right'
	} else {
		// Arrow points up/down
		return align.edge === 'top' ? 'top' : 'bottom'
	}
}

function getFinalArrowPosition(
	targetRect: Rect,
	popoutRect: Rect,
	position: PositionResult,
	fallback: string
): string {
	const targetCenterX = targetRect.x + targetRect.width / 2
	const targetCenterY = targetRect.y + targetRect.height / 2
	const popoutLeft = position.x
	const popoutRight = position.x + popoutRect.width
	const popoutTop = position.y
	const popoutBottom = position.y + popoutRect.height
	const canPointFromTopOrBottom = targetCenterX >= popoutLeft && targetCenterX <= popoutRight
	const canPointFromLeftOrRight = targetCenterY >= popoutTop && targetCenterY <= popoutBottom

	if ((fallback === 'top' || fallback === 'bottom') && canPointFromTopOrBottom) {
		return fallback
	}
	if ((fallback === 'left' || fallback === 'right') && canPointFromLeftOrRight) {
		return fallback
	}

	if (targetCenterX < popoutLeft) return 'left'
	if (targetCenterX > popoutRight) return 'right'
	if (targetCenterY < popoutTop) return 'top'
	if (targetCenterY > popoutBottom) return 'bottom'

	const edgeDistances = [
		{ position: 'left', distance: Math.abs(targetCenterX - popoutLeft) },
		{ position: 'right', distance: Math.abs(popoutRight - targetCenterX) },
		{ position: 'top', distance: Math.abs(targetCenterY - popoutTop) },
		{ position: 'bottom', distance: Math.abs(popoutBottom - targetCenterY) }
	]
	return edgeDistances.reduce((best, next) => next.distance < best.distance ? next : best, {
		position: fallback,
		distance: Number.POSITIVE_INFINITY
	}).position
}

function getArrowDirection(arrowPosition: string): number {
	return arrowPosition === 'left' || arrowPosition === 'right'
		? HORIZONTAL
		: VERTICAL
}

/**
 * Calculate arrow offset along the edge.
 * @param targetRect - Target dimensions
 * @param position - Calculated position
 * @param direction - HORIZONTAL or VERTICAL
 * @returns Arrow offset in pixels
 */
function calculateArrowOffset(
	targetRect: Rect,
	position: PositionResult,
	direction: number
): number {
	if (direction === HORIZONTAL) {
		// Arrow Y position relative to target center
		const targetCenterY = targetRect.y + targetRect.height / 2
		return targetCenterY - position.y
	} else {
		// Arrow X position relative to target center
		const targetCenterX = targetRect.x + targetRect.width / 2
		return targetCenterX - position.x
	}
}

// =============================================================================
// Element Measurement
// =============================================================================

/**
 * Measure an element's dimensions and position.
 * @param $element - Element to measure
 * @returns Element rectangle
 */
function measureElement($element: HTMLElement | null): Rect {
	if (!$element) {
		return { x: 0, y: 0, width: 0, height: 0 }
	}

	// Temporarily show element if hidden to get dimensions
	const style = $element.style
	const prevDisplay = style.display
	const prevVisibility = style.visibility

	if (!$element.offsetWidth) {
		style.display = 'block'
		style.visibility = 'hidden'
	}

	const rect = $element.getBoundingClientRect()

	// Restore
	style.display = prevDisplay
	style.visibility = prevVisibility

	return {
		x: rect.left,
		y: rect.top,
		width: rect.width,
		height: rect.height
	}
}
