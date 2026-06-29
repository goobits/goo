import { describe, expect, it } from 'vitest'

import { mapNativeKeyToCommand } from '../_keyboardHandler.ts'

describe('GooSelect keyboard handler', () => {
	it.each([ 'Enter', ' ', 'Space', 'Spacebar' ])('maps activation key %s to enter command', key => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key
		})

		expect(mapNativeKeyToCommand(event)?.command).toBe('enter')
	})
})
