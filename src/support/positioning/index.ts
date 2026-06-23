/**
 * @fileoverview Positioning utilities for elements.
 * Provides alignment, containment, and flipping for popouts, tooltips, and menus.
 * @module goo/positioning
 */

// High-level utility
export { positionElementAt } from './positionElementAt.ts'

// Core positioning functions
export {
	applyArrowPosition,
	applyPosition,
	calculatePosition,
	getOppositeEdge,
	parseAlignment
} from './calculatePosition.ts'
export { HORIZONTAL, VERTICAL } from './direction.ts'

// Types
export type {
	AlignmentConfig,
	PositionAvoidRect,
	PositionElementAtOptions,
	PositionOptions,
	PositionResult
} from './types.ts'
