import { describe, expect, it, vi } from 'vitest'

import {
	mapNativeKeyToCommand,
	mapNativeTypeaheadKeyToCommand
} from '../_keyboardHandler.ts'

describe('GooSelect keyboard handler', () => {
	it.each([ 'Enter', ' ', 'Space', 'Spacebar' ])('maps activation key %s to enter command', key => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key
		})

		expect(mapNativeKeyToCommand(event)?.command).toBe('enter')
	})

	it('contains canceled native commands', () => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowDown'
		})

		mapNativeKeyToCommand(event)?.cancel()

		expect(event.defaultPrevented).toBe(true)
		expect(event.cancelBubble).toBe(true)
	})

	it('contains canceled native typeahead commands', () => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'a'
		})
		const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation')

		mapNativeTypeaheadKeyToCommand(event)?.cancel()

		expect(event.defaultPrevented).toBe(true)
		expect(stopImmediatePropagation).toHaveBeenCalledOnce()
	})
})
