import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooProgressRing from '../GooProgressRing.svelte'
import { createGooProgressRingTimer, type GooProgressRingTimer } from '../index.ts'

/** The rendered ring element inside a timer's shell.  * @param timer - timer.
 */
function ringEl(timer: GooProgressRingTimer): HTMLElement {
	return timer.element.querySelector('.goo-progress-ring') as HTMLElement
}

describe('GooProgressRing', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('creates a timer with a visible progress ring', () => {
		const timer = createGooProgressRingTimer({
			progress: 0.25,
			showBackdrop: false,
			size: 64
		})

		expect(timer.element.tagName).toBe('DIV')
		expect(timer.element.classList.contains('goo-progress-ring-timer')).toBe(true)
		expect(ringEl(timer).querySelector('canvas')).toBeTruthy()
		expect(timer.progress).toBe(0.25)
		expect(timer.visible).toBe(true)
		expect(ringEl(timer).getAttribute('aria-label')).toBe('Progress')
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('25')

		timer.destroy()
	})

	it('renders declarative progress, sizing, color, and accessible state', async() => {
		const { container } = render(GooProgressRing, {
			props: {
				progress: 0.42,
				size: 52,
				thickness: 7,
				color: '#123456',
				showText: false,
				label: 'Sprint progress'
			}
		})
		await tick()
		const ring = container.querySelector<HTMLElement>('.goo-progress-ring')!

		expect(ring.style.getPropertyValue('--goo-progress-ring-size')).toBe('52px')
		expect(ring.style.getPropertyValue('--goo-progress-ring-thickness')).toBe('7px')
		expect(ring.style.getPropertyValue('--goo-progress-ring-color')).toBe('#123456')
		expect(ring.getAttribute('role')).toBe('progressbar')
		expect(ring.getAttribute('aria-label')).toBe('Sprint progress')
		expect(ring.getAttribute('aria-valuenow')).toBe('42')
		expect(ring.getAttribute('aria-valuetext')).toBe('42%')
		expect(ring.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true')
	})

	it('clamps declarative progress and omits determinate values while busy', async() => {
		const { container, rerender } = render(GooProgressRing, {
			props: {
				progress: 2
			}
		})
		const ring = container.querySelector<HTMLElement>('.goo-progress-ring')!

		expect(ring.getAttribute('aria-valuenow')).toBe('100')

		await rerender({ progress: -1, indeterminate: true })

		expect(ring.getAttribute('aria-busy')).toBe('true')
		expect(ring.hasAttribute('aria-valuenow')).toBe(false)
		expect(ring.hasAttribute('aria-valuetext')).toBe(false)
	})

	it('normalizes non-finite declarative values', () => {
		const { container } = render(GooProgressRing, {
			props: {
				progress: Number.NaN,
				size: Number.POSITIVE_INFINITY,
				thickness: Number.NaN
			}
		})
		const ring = container.querySelector<HTMLElement>('.goo-progress-ring')!

		expect(ring.getAttribute('aria-valuenow')).toBe('0')
		expect(ring.style.getPropertyValue('--goo-progress-ring-size')).toBe('')
		expect(ring.style.getPropertyValue('--goo-progress-ring-thickness')).toBe('')
	})

	it('clamps progress values', () => {
		const timer = createGooProgressRingTimer({ showBackdrop: false })

		timer.setProgress(2)
		expect(timer.progress).toBe(1)
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('100')

		timer.setProgress(-1)
		expect(timer.progress).toBe(0)
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('0')

		timer.destroy()
	})

	it('supports show, hide, and destroy', () => {
		const timer = createGooProgressRingTimer({ showBackdrop: false })

		timer.show('cover')
		expect(timer.visible).toBe(true)
		expect(timer.element.dataset.cover).toBe('true')
		expect(timer.element.classList.contains('visible')).toBe(true)

		timer.hide({ immediate: true })
		expect(timer.visible).toBe(false)
		expect(timer.element.style.visibility).toBe('hidden')

		timer.destroy()
		expect(timer.element.isConnected).toBe(false)
	})

	it('supports indeterminate spinner mode', () => {
		const timer = createGooProgressRingTimer({
			indeterminate: true,
			showBackdrop: false
		})

		expect(timer.indeterminate).toBe(true)
		expect(timer.visible).toBe(true)
		expect(ringEl(timer).dataset.indeterminate).toBe('true')
		expect(ringEl(timer).getAttribute('aria-busy')).toBe('true')
		expect(ringEl(timer).hasAttribute('aria-valuenow')).toBe(false)

		timer.indeterminate = false
		expect(timer.indeterminate).toBe(false)
		expect(ringEl(timer).dataset.indeterminate).toBe('false')
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('0')

		timer.destroy()
	})

	it('maps weighted step progress and advances explicitly', () => {
		const timer = createGooProgressRingTimer({
			progress: 0.5,
			showBackdrop: false,
			steps: [ 0.2, 0.4, 0.4 ],
			useAutoHide: false
		})

		expect(timer.stepIndex).toBe(0)
		expect(timer.progress).toBe(0.5)
		expect(timer.totalProgress).toBeCloseTo(0.1)
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('10')

		timer.advance()
		expect(timer.stepIndex).toBe(1)
		expect(timer.progress).toBe(0)
		expect(timer.totalProgress).toBeCloseTo(0.2)

		timer.setProgress(0.5)
		expect(timer.totalProgress).toBeCloseTo(0.4)
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('40')

		timer.advance()
		timer.setProgress(1)
		expect(timer.stepIndex).toBe(2)
		expect(timer.totalProgress).toBe(1)

		timer.destroy()
	})

	it('supports numeric equal steps', () => {
		const timer = createGooProgressRingTimer({
			progress: 0.5,
			showBackdrop: false,
			steps: 4,
			useAutoHide: false
		})

		expect(timer.totalProgress).toBeCloseTo(0.125)
		timer.advance()
		expect(timer.totalProgress).toBeCloseTo(0.25)

		timer.destroy()
	})

	it('uses themed default variant unless construction overrides it', () => {
		const host = document.createElement('div')
		host.style.setProperty('--goo-progress-ring-variant', 'rainbow')
		document.body.append(host)

		const themed = createGooProgressRingTimer({
			parentNode: host,
			showBackdrop: false
		})
		const explicit = createGooProgressRingTimer({
			parentNode: host,
			variant: 'basic',
			showBackdrop: false
		})

		expect(ringEl(themed).dataset.variant).toBe('rainbow')
		expect(ringEl(explicit).dataset.variant).toBe('basic')

		themed.destroy()
		explicit.destroy()
		host.remove()
	})

	it('ignores public updates after destroy', () => {
		vi.useFakeTimers()
		const timer = createGooProgressRingTimer({
			progress: 0.25,
			showBackdrop: false,
			useAutoHide: false
		})
		const element = timer.element

		timer.destroy()
		timer.setProgress(0.75)
		timer.show()
		timer.hide()
		timer.advance()
		timer.indeterminate = true
		timer.steps = 4
		vi.runAllTimers()

		expect(timer.progress).toBe(0.25)
		expect(timer.indeterminate).toBe(false)
		expect(timer.steps).toBeNull()
		expect(element.isConnected).toBe(false)
	})
})
