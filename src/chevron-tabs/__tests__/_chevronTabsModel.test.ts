import { describe, expect, it } from 'vitest'

import {
	chevronTabDragActivationDistance,
	hasChevronTabDragIntent,
	resolveChevronTabDragInsertion,
	resolveChevronTabKeyboardTargetIndex
} from '../_chevronTabsModel.ts'

describe('chevron tabs model', () => {
	it('resolves keyboard navigation targets', () => {
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'ArrowRight')).toBe(2)
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'ArrowDown')).toBe(2)
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'ArrowLeft')).toBe(0)
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'ArrowUp')).toBe(0)
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'Home')).toBe(0)
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'End')).toBe(2)
		expect(resolveChevronTabKeyboardTargetIndex(0, 3, 'ArrowLeft')).toBe(2)
		expect(resolveChevronTabKeyboardTargetIndex(2, 3, 'ArrowRight')).toBe(0)
	})

	it('ignores keyboard navigation when the source tab is unavailable', () => {
		expect(resolveChevronTabKeyboardTargetIndex(-1, 3, 'ArrowRight')).toBeNull()
		expect(resolveChevronTabKeyboardTargetIndex(0, 0, 'ArrowRight')).toBeNull()
		expect(resolveChevronTabKeyboardTargetIndex(1, 3, 'Enter')).toBeNull()
	})

	it('resolves drag insertion before, between, and after other tab centers', () => {
		const centers = [50, 150, 250]

		expect(resolveChevronTabDragInsertion(20, centers)).toBe(0)
		expect(resolveChevronTabDragInsertion(100, centers)).toBe(1)
		expect(resolveChevronTabDragInsertion(200, centers)).toBe(2)
		expect(resolveChevronTabDragInsertion(300, centers)).toBe(3)
	})

	it('requires deliberate pointer movement before treating a tab click as drag', () => {
		expect(hasChevronTabDragIntent(chevronTabDragActivationDistance - 1)).toBe(false)
		expect(hasChevronTabDragIntent(-(chevronTabDragActivationDistance - 1))).toBe(false)
		expect(hasChevronTabDragIntent(chevronTabDragActivationDistance)).toBe(true)
		expect(hasChevronTabDragIntent(-chevronTabDragActivationDistance)).toBe(true)
		expect(hasChevronTabDragIntent(chevronTabDragActivationDistance, 30)).toBe(false)
		expect(hasChevronTabDragIntent(30, 10)).toBe(true)
	})
})
