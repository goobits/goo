import { describe, expect, it } from 'vitest'

import { createGooProgressRingTimer, type GooProgressRingTimer } from '../index.js'

/** The rendered ring element inside a timer's shell. */
function ringEl(timer: GooProgressRingTimer): HTMLElement {
	return timer.$element.querySelector('.goo-progress-ring') as HTMLElement
}

describe('GooProgressRing', () => {
	it('creates a timer with a visible progress ring', () => {
		const timer = createGooProgressRingTimer({
			progress: 0.25,
			showBackdrop: false,
			size: 64
		})

		expect(timer.$element.tagName).toBe('DIV')
		expect(timer.$element.classList.contains('goo-progress-ring-timer')).toBe(true)
		expect(timer.canvas?.tagName.toLowerCase()).toBe('canvas')
		expect(timer.progress).toBe(0.25)
		expect(timer.visible).toBe(true)
		expect(ringEl(timer).getAttribute('aria-label')).toBe('Progress')
		expect(ringEl(timer).getAttribute('aria-valuenow')).toBe('25')

		timer.destroy()
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
		expect(timer.$element.dataset.cover).toBe('true')
		expect(timer.$element.classList.contains('visible')).toBe(true)

		timer.hide({ immediate: true })
		expect(timer.visible).toBe(false)
		expect(timer.$element.style.visibility).toBe('hidden')

		timer.destroy()
		expect(timer.$element.isConnected).toBe(false)
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

	it('uses themed default renderer unless construction overrides it', () => {
		const host = document.createElement('div')
		host.style.setProperty('--goo-progress-ring-variant', 'rainbow')
		document.body.append(host)

		const themed = createGooProgressRingTimer({
			parentNode: host,
			showBackdrop: false
		})
		const explicit = createGooProgressRingTimer({
			parentNode: host,
			renderer: 'basic',
			showBackdrop: false
		})

		expect(ringEl(themed).dataset.variant).toBe('rainbow')
		expect(ringEl(explicit).dataset.variant).toBe('basic')

		themed.destroy()
		explicit.destroy()
		host.remove()
	})
})
