import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	getGridPopoutKeyboardDelta,
	handleGridPopoutListKeyboardEvent,
	handleGridPopoutTriggerKeyboardEvent
} from '../_gridPopoutKeyboard.ts'

describe('grid popout keyboard helpers', () => {
	afterEach(() => {
		document.body.replaceChildren()
		document.documentElement.removeAttribute('dir')
		document.body.removeAttribute('dir')
	})

	it.each([ 'Enter', ' ', 'Spacebar', 'ArrowDown' ])('opens from trigger key %s', key => {
		const open = vi.fn()
		const event = dispatchTriggerKey(key, {
			close: vi.fn(),
			isOpen: () => false,
			open
		})

		expect(event.defaultPrevented).toBe(true)
		expect(open).toHaveBeenCalledOnce()
	})

	it('contains handled trigger keys', () => {
		const parent = document.createElement('div')
		const trigger = document.createElement('button')
		const parentKeydown = vi.fn()
		parent.append(trigger)
		parent.addEventListener('keydown', parentKeydown)
		trigger.addEventListener('keydown', event => {
			handleGridPopoutTriggerKeyboardEvent(event, {
				close: vi.fn(),
				isOpen: () => false,
				open: vi.fn()
			})
		})

		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'Spacebar'
		})
		trigger.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
	})

	it('closes and contains Escape from an open trigger', () => {
		const close = vi.fn()
		const event = dispatchTriggerKey('Escape', {
			close,
			isOpen: () => true,
			open: vi.fn()
		})

		expect(event.defaultPrevented).toBe(true)
		expect(close).toHaveBeenCalledOnce()
	})

	it.each([ 'Enter', ' ', 'Spacebar' ])('chooses the focused option from list activation key %s', key => {
		const option = document.createElement('div')
		option.className = 'goo-grid-picker__item'
		const choose = vi.fn()
		option.dataset.optionId = 'brush'

		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key
		})
		option.dispatchEvent(event)
		handleGridPopoutListKeyboardEvent(event, {
			choose,
			close: vi.fn(),
			focusSibling: vi.fn(),
			focusTrigger: vi.fn()
		})

		expect(event.defaultPrevented).toBe(true)
		expect(choose).toHaveBeenCalledExactlyOnceWith('brush')
	})

	it('resolves horizontal deltas from document direction', () => {
		expect(getGridPopoutKeyboardDelta('ArrowLeft')).toBe(-1)
		expect(getGridPopoutKeyboardDelta('ArrowRight')).toBe(1)
		document.documentElement.dir = 'rtl'
		expect(getGridPopoutKeyboardDelta('ArrowLeft')).toBe(1)
		expect(getGridPopoutKeyboardDelta('ArrowRight')).toBe(-1)
	})
})

function dispatchTriggerKey(
	key: string,
	options: Parameters<typeof handleGridPopoutTriggerKeyboardEvent>[1]
): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key
	})
	handleGridPopoutTriggerKeyboardEvent(event, options)
	return event
}
