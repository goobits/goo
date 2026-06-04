/**
 * @fileoverview High-level positioning utility for elements.
 * Combines calculation and application into a single easy-to-use function.
 * @module goo/positioning/positionElementAt
 */

import {
	applyArrowPosition,
	applyPosition,
	calculatePosition
} from './calculatePosition.ts'
import { HORIZONTAL } from './direction.ts'
import type { PositionElementAtOptions, PositionResult } from './types.ts'

/**
 * Position an element relative to a target element or point.
 * Handles containment, flipping, and arrow positioning in one call.
 *
 * @example
 * // Position a tooltip to the right of a button
 * positionElementAt(tooltip, {
 *   at: button,
 *   align: 'left to right',
 *   keepWithin: { $element: document.body, margin: 15 }
 * })
 *
 * @example
 * // Position at coordinates
 * positionElementAt(menu, {
 *   at: { x: event.clientX, y: event.clientY },
 *   align: 'top left to bottom left'
 * })
 *
 * @example
 * // Full-screen mode (mobile-friendly)
 * positionElementAt(panel, {
 *   at: trigger,
 *   keepWithin: { $element: document.body, fullScreen: true }
 * })
 *
 * @param $element - The element to position
 * @param options - Positioning options
 * @returns Position result with calculated values
 */
export function positionElementAt(
	$element: HTMLElement,
	options: PositionElementAtOptions
): PositionResult {
	const {
		at,
		align = 'left to right',
		offset = { x: 15, y: 15 },
		keepWithin,
		$arrow,
		rtl
	} = options

	// Handle full-screen mode
	if (keepWithin?.fullScreen) {
		applyFullScreen($element)

		// Hide arrow in full-screen mode
		if ($arrow) {
			$arrow.style.display = 'none'
		}

		return {
			x: 0,
			y: 0,
			direction: HORIZONTAL,
			flippedX: false,
			flippedY: false,
			maxWidth: window.innerWidth,
			maxHeight: window.innerHeight
		}
	}

	// Parse target
	let element: HTMLElement | undefined
	let x: number | undefined
	let y: number | undefined

	if (at instanceof HTMLElement) {
		element = at
	} else if (at && typeof at === 'object') {
		x = at.x
		y = at.y
	}

	// Reset element size to get natural dimensions
	const style = $element.style
	style.width = ''
	style.height = ''

	// Calculate position
	const position = calculatePosition($element, {
		element,
		x,
		y,
		align,
		offset,
		keepWithin: keepWithin ? {
			$element: keepWithin.$element,
			margin: keepWithin.margin
		} : undefined,
		rtl
	})

	// Apply position
	applyPosition($element, position)

	// Apply arrow position
	if ($arrow) {
		$arrow.style.display = ''
		applyArrowPosition($arrow, position)
	}

	return position
}

/**
 * Apply full-screen positioning to an element.
 * @param $element - The element to position
 */
function applyFullScreen($element: HTMLElement): void {
	const style = $element.style
	style.position = 'fixed'
	style.left = '0'
	style.top = '0'
	style.width = '100%'
	style.height = '100%'
	style.maxWidth = '100%'
	style.maxHeight = '100%'
}
