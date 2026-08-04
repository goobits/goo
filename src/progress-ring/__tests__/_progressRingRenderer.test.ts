import { describe, expect, it } from 'vitest'

import { smoothProgressToward } from '../_progressRingRenderer.ts'

describe('progress ring smoothing', () => {
	it('follows abrupt targets smoothly without overshooting', () => {
		let state = { value: 0, velocity: 0 }
		let maximumFrameStep = 0

		for (let frame = 0; frame < 120; frame += 1) {
			const previous = state.value
			state = smoothProgressToward(state.value, 1, state.velocity, 1 / 60, 5)
			maximumFrameStep = Math.max(maximumFrameStep, state.value - previous)
			expect(state.value).toBeGreaterThanOrEqual(previous)
			expect(state.value).toBeLessThanOrEqual(1)
		}

		expect(maximumFrameStep).toBeLessThan(0.020001)
		expect(state).toEqual({ value: 1, velocity: 0 })
	})

	it('does not advance without a rendered frame and supports immediate mode', () => {
		expect(smoothProgressToward(0.25, 0.75, 0.5, 0, 5)).toEqual({
			value: 0.25,
			velocity: 0.5
		})
		expect(smoothProgressToward(0.25, 0.75, 0.5, 1 / 60, 0)).toEqual({
			value: 0.75,
			velocity: 0
		})
	})

	it('retargets mid-flight without stopping at an obsolete percentage', () => {
		let state = { value: 0, velocity: 0 }
		for (let frame = 0; frame < 12; frame += 1) {
			state = smoothProgressToward(state.value, 0.3, state.velocity, 1 / 60, 5)
		}
		expect(state.value).toBeLessThan(0.3)

		let crossedOldTargetStep = 0
		for (let frame = 0; frame < 720; frame += 1) {
			const previous = state.value
			state = smoothProgressToward(state.value, 0.9, state.velocity, 1 / 60, 5)
			if (previous < 0.3 && state.value >= 0.3) {
				crossedOldTargetStep = state.value - previous
			}
		}

		expect(crossedOldTargetStep).toBeGreaterThan(0)
		expect(state).toEqual({ value: 0.9, velocity: 0 })
	})

	it('keeps incomplete progress moving instead of racing to sparse reports', () => {
		let state = { value: 0, velocity: 0 }
		let maximumFrameStep = 0
		for (let frame = 0; frame < 30; frame += 1) {
			const previous = state.value
			state = smoothProgressToward(state.value, 0.48, state.velocity, 1 / 60, 5)
			maximumFrameStep = Math.max(maximumFrameStep, state.value - previous)
		}

		expect(state.value).toBeGreaterThan(0)
		expect(state.value).toBeLessThan(0.48)
		expect(state.velocity).toBeGreaterThan(0)
		expect(maximumFrameStep).toBeLessThan(0.020001)
	})

	it('resumes promptly when progress advances after settling', () => {
		let state = { value: 0.05, velocity: 0 }
		for (let frame = 0; frame < 7; frame += 1) {
			state = smoothProgressToward(state.value, 0.1, state.velocity, 1 / 60, 5)
		}

		expect(state.value).toBeGreaterThanOrEqual(0.06)
	})
})
