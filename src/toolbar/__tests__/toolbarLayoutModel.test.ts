import { describe, expect, it } from 'vitest'

import {
	chooseToolbarLayout,
	getToolbarLayoutSignature,
	isToolbarHorizontalPosition,
	toToolbarButtonLayout
} from '../toolbarLayoutModel.ts'

describe('toolbarLayoutModel', () => {
	it('normalizes modern command lists into toolbar groups', () => {
		const layout = toToolbarButtonLayout({
			primaryCommands: [ 'select', { id: 'brush' } ],
			secondaryCommands: [ 'settings' ]
		}, command => typeof command === 'string' ? { id: command } : command)

		expect(layout).toEqual({
			top: [ { id: 'select' }, { id: 'brush' } ],
			middle: [],
			bottom: [ { id: 'settings' } ]
		})
	})

	it('preserves already-grouped legacy toolbar layouts', () => {
		const layout = toToolbarButtonLayout({
			top: [ { id: 'select' } ],
			bottom: [ { id: 'settings' } ],
			primaryCommands: [ 'ignored' ]
		}, command => typeof command === 'string' ? { id: command } : command)

		expect(layout).toEqual({
			top: [ { id: 'select' } ],
			bottom: [ { id: 'settings' } ]
		})
	})

	it('detects horizontal toolbar positions', () => {
		expect(isToolbarHorizontalPosition('top')).toBe(true)
		expect(isToolbarHorizontalPosition('bottom')).toBe(true)
		expect(isToolbarHorizontalPosition('left')).toBe(false)
		expect(isToolbarHorizontalPosition('right')).toBe(false)
	})

	it('creates stable layout signatures from visible entries', () => {
		expect(getToolbarLayoutSignature({
			top: [ { id: 'select' }, { id: 'brush' } ],
			bottom: [ { id: 'settings' } ]
		})).toBe('select,brush,settings')
	})

	it('chooses compact layout modes from available space', () => {
		expect(chooseToolbarLayout({
			buttonSize: 40,
			mainSize: 360,
			primaryCount: 5,
			secondaryCount: 3
		})).toBe('showAll')

		expect(chooseToolbarLayout({
			buttonSize: 40,
			mainSize: 260,
			primaryCount: 5,
			secondaryCount: 3
		})).toBe('shrinkBottom')

		expect(chooseToolbarLayout({
			buttonSize: 40,
			mainSize: 220,
			primaryCount: 5,
			secondaryCount: 3
		})).toBe('scrollTopShrinkBottom')
	})
})
