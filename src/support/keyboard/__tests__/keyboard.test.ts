import { describe, expect, it, vi } from 'vitest'

import {
	containKeyboardEvent,
	handleKeyboardActivation,
	isKeyboardActivationKey
} from '../index.ts'

describe('Goo keyboard facade', () => {
	it.each([ 'Enter', ' ', 'Space', 'Spacebar' ])('recognizes the %s activation key', key => {
		expect(isKeyboardActivationKey(key)).toBe(true)
	})

	it('contains handled events with configurable propagation', () => {
		const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
		const stopPropagation = vi.spyOn(event, 'stopPropagation')
		const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation')

		containKeyboardEvent(event, { stopImmediatePropagation: false })

		expect(event.defaultPrevented).toBe(true)
		expect(stopPropagation).toHaveBeenCalledOnce()
		expect(stopImmediatePropagation).not.toHaveBeenCalled()
	})

	it('activates only recognized keys', () => {
		const activate = vi.fn()
		expect(handleKeyboardActivation(new KeyboardEvent('keydown', { key: 'Escape' }), activate)).toBe(false)
		expect(handleKeyboardActivation(new KeyboardEvent('keydown', { key: 'Enter' }), activate)).toBe(true)
		expect(activate).toHaveBeenCalledOnce()
	})
})
