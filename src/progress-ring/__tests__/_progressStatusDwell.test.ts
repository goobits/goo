import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProgressStatusDwell } from '../_progressStatusDwell.ts'

describe('progress status dwell', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('keeps visible text for the minimum duration and coalesces pending updates', () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
		const changes: string[] = []
		const dwell = createProgressStatusDwell({
			initialText: 'Loading showcase',
			minimumDurationMs: 500,
			onTextChange: text => changes.push(text)
		})

		dwell.update('Registering Tabby')
		vi.advanceTimersByTime(200)
		dwell.update('Starting renderer')
		vi.advanceTimersByTime(299)
		expect(changes).toEqual([])

		vi.advanceTimersByTime(1)
		expect(changes).toEqual([ 'Starting renderer' ])
	})

	it('gives each newly visible text its own dwell window', () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
		const changes: string[] = []
		const dwell = createProgressStatusDwell({
			initialText: 'Loading',
			minimumDurationMs: 500,
			onTextChange: text => changes.push(text)
		})

		dwell.update('Working')
		vi.advanceTimersByTime(500)
		expect(changes).toEqual([ 'Working' ])

		vi.advanceTimersByTime(200)
		dwell.update('Finishing')
		vi.advanceTimersByTime(299)
		expect(changes).toEqual([ 'Working' ])

		vi.advanceTimersByTime(1)
		expect(changes).toEqual([ 'Working', 'Finishing' ])
	})

	it('can show a terminal status immediately', () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
		const changes: string[] = []
		const dwell = createProgressStatusDwell({
			initialText: 'Loading',
			minimumDurationMs: 500,
			onTextChange: text => changes.push(text)
		})

		dwell.update('Working')
		vi.advanceTimersByTime(200)
		dwell.update('Ready', true)
		expect(changes).toEqual([ 'Ready' ])

		vi.advanceTimersByTime(500)
		expect(changes).toEqual([ 'Ready' ])
	})
})
