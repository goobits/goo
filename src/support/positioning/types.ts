/**
 * @fileoverview Shared types for positioning utilities.
 * @module goo/positioning/types
 */

/**
 * Alignment configuration parsed from an alignment string.
 */
export interface AlignmentConfig {
	edge: string
	position: string
	toEdge: string
	toPosition: string
}

/**
 * Options for calculating element position.
 */
export interface PositionOptions {

	/** Target element to position relative to */
	element?: HTMLElement

	/** X coordinate (if no element) */
	x?: number

	/** Y coordinate (if no element) */
	y?: number

	/** Alignment string (e.g., 'left to right') or parsed config */
	align?: string | AlignmentConfig

	/** Offset from calculated position */
	offset?: { x?: number; y?: number }

	/** Containment configuration */
	keepWithin?: {
		$element?: HTMLElement
		margin?: number
	}

	/** Right-to-left mode */
	rtl?: boolean
}

/**
	 * Result of position calculation.
	 */
export interface PositionResult {

	/** Calculated X position */
	x: number

	/** Calculated Y position */
	y: number

	/** Direction: HORIZONTAL (0) or VERTICAL (1) */
	direction: number

	/** Whether position was flipped horizontally */
	flippedX: boolean

	/** Whether position was flipped vertically */
	flippedY: boolean

	/** Maximum width within container */
	maxWidth?: number

	/** Maximum height within container */
	maxHeight?: number

	/** Arrow position class ('left', 'right', 'top', 'bottom') */
	arrowPosition?: string

	/** Arrow offset along edge (px) */
	arrowOffset?: number
}

/**
	 * Options for positioning an element at a target.
	 */
export interface PositionElementAtOptions {

	/** Target element or point to position relative to */
	at: HTMLElement | { x?: number; y?: number }

	/** Alignment string (e.g., 'left to right', 'bottom center to top center') */
	align?: string

	/** Offset from calculated position */
	offset?: { x?: number; y?: number }

	/** Containment configuration */
	keepWithin?: {
		$element?: HTMLElement
		margin?: number
		fullScreen?: boolean
	}

	/** Arrow element to position */
	$arrow?: HTMLElement

	/** Right-to-left mode (defaults to document direction) */
	rtl?: boolean
}
