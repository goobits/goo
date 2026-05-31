import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooCheckbox from '../GooCheckbox.svelte'
import { GooCheckbox as ExportedGooCheckbox } from '../index.js'

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
})
