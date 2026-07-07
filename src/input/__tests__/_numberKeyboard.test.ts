import { describe, expect, it } from 'vitest'

import { readNumberKeyboardAction } from '../_numberKeyboard.ts'

describe('GooNumber keyboard helpers', () => {
	const finiteBounds = {
		hasMaximum: true,
		hasMinimum: true
	}

	it.each([
		[ 'ArrowUp', false, { type: 'step', direction: 'up', multiplier: 1 } ],
		[ 'ArrowUp', true, { type: 'step', direction: 'up', multiplier: 10 } ],
		[ 'ArrowDown', false, { type: 'step', direction: 'down', multiplier: 1 } ],
		[ 'ArrowDown', true, { type: 'step', direction: 'down', multiplier: 10 } ],
		[ 'PageUp', false, { type: 'step', direction: 'up', multiplier: 10 } ],
		[ 'PageDown', false, { type: 'step', direction: 'down', multiplier: 10 } ]
	])('maps %s shift=%s to step action', (key, shiftKey, action) => {
		expect(readNumberKeyboardAction({ key, shiftKey }, finiteBounds)).toEqual(action)
	})

	it('maps commit and blur keys', () => {
		expect(readNumberKeyboardAction({ key: 'Enter', shiftKey: false }, finiteBounds)).toEqual({ type: 'commit' })
		expect(readNumberKeyboardAction({ key: 'Escape', shiftKey: false }, finiteBounds)).toEqual({ type: 'blur' })
	})

	it('maps Home and End only when the matching bound is finite', () => {
		expect(readNumberKeyboardAction({ key: 'Home', shiftKey: false }, finiteBounds)).toEqual({
			bound: 'min',
			type: 'set-bound'
		})
		expect(readNumberKeyboardAction({ key: 'End', shiftKey: false }, finiteBounds)).toEqual({
			bound: 'max',
			type: 'set-bound'
		})
		expect(readNumberKeyboardAction({ key: 'Home', shiftKey: false }, {
			hasMaximum: true,
			hasMinimum: false
		})).toBeNull()
		expect(readNumberKeyboardAction({ key: 'End', shiftKey: false }, {
			hasMaximum: false,
			hasMinimum: true
		})).toBeNull()
	})

	it('ignores unrelated keys', () => {
		expect(readNumberKeyboardAction({ key: 'a', shiftKey: false }, finiteBounds)).toBeNull()
	})
})
