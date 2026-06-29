import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleFocusTrapKeyboardEvent } from '../_focusTrapKeyboard.ts'

describe('focus trap keyboard helpers', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('contains Escape and calls the escape handler', () => {
		const { event, onBodyKeydown, onEscape } = dispatchTrapKey('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(onEscape).toHaveBeenCalledOnce()
		expect(onBodyKeydown).not.toHaveBeenCalled()
	})

	it('wraps Shift+Tab from the first item to the last item', () => {
		const { event, first, last, onBodyKeydown } = dispatchTrapKey('Tab', { focus: 'first', shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(last)
		expect(document.activeElement).not.toBe(first)
		expect(onBodyKeydown).not.toHaveBeenCalled()
	})

	it('wraps Tab from the last item to the first item', () => {
		const { event, first, onBodyKeydown } = dispatchTrapKey('Tab', { focus: 'last' })

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(first)
		expect(onBodyKeydown).not.toHaveBeenCalled()
	})
})

function dispatchTrapKey(
	key: string,
	options: { focus?: 'first' | 'last'; shiftKey?: boolean } = {}
) {
	const root = document.createElement('div')
	const first = document.createElement('button')
	const last = document.createElement('button')
	const onEscape = vi.fn()
	const onBodyKeydown = vi.fn()

	root.append(first, last)
	document.body.append(root)
	document.body.addEventListener('keydown', onBodyKeydown)
	if (options.focus === 'first') first.focus()
	if (options.focus === 'last') last.focus()

	root.addEventListener('keydown', event => {
		handleFocusTrapKeyboardEvent(event, { onEscape, root })
	})

	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key,
		shiftKey: options.shiftKey
	})
	const target = options.focus === 'first' ? first : options.focus === 'last' ? last : root
	target.dispatchEvent(event)

	return {
		event,
		first,
		last,
		onBodyKeydown,
		onEscape
	}
}
