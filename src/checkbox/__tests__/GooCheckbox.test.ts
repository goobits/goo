import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import GooCheckbox from '../GooCheckbox.svelte'
import { GooCheckbox as ExportedGooCheckbox } from '../index.ts'

describe('GooCheckbox', () => {
	it('exports the native Svelte component from the package subpath', () => {
		expect(ExportedGooCheckbox).toBe(GooCheckbox)
	})

	it('toggles without entering the transitionless dragging state', async() => {
		const onchange = vi.fn()
		const { container } = render(GooCheckbox, {
			props: {
				label: 'Enable',
				onchange
			}
		})
		const checkbox = container.querySelector<HTMLDivElement>('.goo-checkbox')!

		await fireEvent.pointerDown(checkbox, { clientX: 0 })
		await tick()

		expect(checkbox.classList.contains('goo-checkbox--dragging')).toBe(false)

		await fireEvent.click(checkbox)

		expect(checkbox.getAttribute('aria-checked')).toBe('true')
		expect(checkbox.classList.contains('goo-checkbox--checked')).toBe(true)
		expect(checkbox.classList.contains('goo-checkbox--dragging')).toBe(false)
		expect(onchange).toHaveBeenCalledExactlyOnceWith(true, false)
	})

	it('uses the transitionless dragging state only after pointer movement', async() => {
		const { container } = render(GooCheckbox)
		const checkbox = container.querySelector<HTMLDivElement>('.goo-checkbox')!

		await fireEvent.pointerDown(checkbox, { clientX: 0 })
		await fireEvent.pointerMove(checkbox, { clientX: 8 })
		await tick()

		expect(checkbox.classList.contains('goo-checkbox--dragging')).toBe(true)
	})

	it('cleans up touch pointer capture and drag state when the pointer is canceled', async() => {
		const { container } = render(GooCheckbox)
		const checkbox = container.querySelector<HTMLDivElement>('.goo-checkbox')!
		const thumb = container.querySelector<HTMLElement>('.goo-checkbox__thumb')!
		checkbox.setPointerCapture = vi.fn()
		checkbox.releasePointerCapture = vi.fn()

		checkbox.dispatchEvent(pointerEvent('pointerdown', { pointerId: 12, pointerType: 'touch', clientX: 0 }))
		checkbox.dispatchEvent(pointerEvent('pointermove', { pointerId: 12, pointerType: 'touch', clientX: 8 }))
		await tick()

		expect(checkbox.classList.contains('goo-checkbox--dragging')).toBe(true)
		expect(checkbox.setPointerCapture).toHaveBeenCalledWith(12)

		checkbox.dispatchEvent(pointerEvent('pointercancel', { pointerId: 12, pointerType: 'touch', clientX: 8 }))
		await new Promise(resolve => window.setTimeout(resolve))
		await tick()

		expect(checkbox.releasePointerCapture).toHaveBeenCalledWith(12)
		expect(checkbox.classList.contains('goo-checkbox--dragging')).toBe(false)
		expect(thumb.style.left).toBe('')
	})

	it('prevents default browser handling for custom keyboard activation', () => {
		const { container } = render(GooCheckbox)
		const checkbox = container.querySelector<HTMLDivElement>('.goo-checkbox')!

		for (const key of [ 'Enter', ' ', 'ArrowLeft', 'ArrowRight' ]) {
			const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
			checkbox.dispatchEvent(event)

			expect(event.defaultPrevented).toBe(true)
		}
	})
})
