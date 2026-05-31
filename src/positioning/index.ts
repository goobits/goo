/**
 * @fileoverview Positioning utilities for elements.
 * Provides alignment, containment, and flipping for popouts, tooltips, and menus.
 * @module goo/positioning
 */

// High-level utility
export { positionElementAt } from './positionElementAt.js'

// Core positioning functions
export {
	applyArrowPosition,
	applyPosition,
	calculatePosition,
	getOppositeEdge,
	parseAlignment
} from './calculatePosition.js'
export { HORIZONTAL, VERTICAL } from './direction.js'

// Types
export type {
	AlignmentConfig,
	PositionElementAtOptions,
	PositionOptions,
	PositionResult
} from './types.js'
