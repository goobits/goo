import { describe, expect, it, vi } from 'vitest'

import { createLifecycleBag } from '../lifecycleBag.ts'

describe('createLifecycleBag', () => {
	it('runs owned cleanups once when destroyed', () => {
		const bag = createLifecycleBag()
		const cleanup = vi.fn()
		const detach = bag.add(cleanup)

		detach()
		bag.destroy()
		bag.destroy()

		expect(cleanup).toHaveBeenCalledOnce()
		expect(bag.destroyed).toBe(true)
	})

	it('detaches DOM listeners', () => {
		const bag = createLifecycleBag()
		const button = document.createElement('button')
		const listener = vi.fn()

		bag.listen(button, 'click', listener)
		bag.destroy()
		button.click()

		expect(listener).not.toHaveBeenCalled()
	})

	it('cancels timers and animation frames', () => {
		vi.useFakeTimers()
		const bag = createLifecycleBag()
		const timeout = vi.fn()
		const frame = vi.fn()

		bag.timeout(timeout, 25)
		bag.frame(frame)
		bag.destroy()
		vi.runAllTimers()

		expect(timeout).not.toHaveBeenCalled()
		expect(frame).not.toHaveBeenCalled()
		vi.useRealTimers()
	})

	it('runs callbacks once and removes completed work from the bag', () => {
		vi.useFakeTimers()
		const bag = createLifecycleBag()
		const timeout = vi.fn()

		bag.timeout(timeout, 25)
		vi.runAllTimers()
		bag.destroy()

		expect(timeout).toHaveBeenCalledOnce()
		vi.useRealTimers()
	})

	it('destroys handle objects added after destroy immediately', () => {
		const bag = createLifecycleBag()
		const handle = {
			destroy: vi.fn(),
			detach: vi.fn(),
			disconnect: vi.fn()
		}

		bag.destroy()
		bag.add(handle)

		expect(handle.detach).toHaveBeenCalledOnce()
		expect(handle.disconnect).toHaveBeenCalledOnce()
		expect(handle.destroy).toHaveBeenCalledOnce()
	})
})
