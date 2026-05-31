import { describe, expect, it } from 'vitest'

import {
	calculateVirtualGridWindow,
	virtualGridSpacerHeight
} from '../virtualWindow.js'

describe('virtualGridWindow', () => {
	it('returns every slot when virtualization is inactive', () => {
		expect(calculateVirtualGridWindow({
			columns: 4,
			itemsTop: 0,
			overscanRows: 2,
			rowGap: 8,
			scrollTop: 300,
			tileHeight: 100,
			totalItems: 12,
			viewportHeight: 240,
			virtual: false
		})).toEqual({
			startSlot: 0,
			endSlot: 12,
			topRows: 0,
			bottomRows: 0
		})
	})

	it('calculates a scroll window with overscan rows', () => {
		expect(calculateVirtualGridWindow({
			columns: 4,
			itemsTop: 0,
			overscanRows: 1,
			rowGap: 10,
			scrollTop: 330,
			tileHeight: 100,
			totalItems: 100,
			viewportHeight: 220,
			virtual: true
		})).toEqual({
			startSlot: 8,
			endSlot: 28,
			topRows: 2,
			bottomRows: 18
		})
	})

	it('clamps the virtual window to the available slot range', () => {
		expect(calculateVirtualGridWindow({
			columns: 3,
			itemsTop: 0,
			overscanRows: 2,
			rowGap: 10,
			scrollTop: 900,
			tileHeight: 100,
			totalItems: 10,
			viewportHeight: 220,
			virtual: true
		})).toEqual({
			startSlot: 9,
			endSlot: 10,
			topRows: 3,
			bottomRows: 0
		})
	})

	it('calculates spacer height from rows and gaps', () => {
		expect(virtualGridSpacerHeight(0, 100, 10)).toBe(0)
		expect(virtualGridSpacerHeight(3, 100, 10)).toBe(320)
	})
})
