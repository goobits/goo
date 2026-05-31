import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooButton from '../GooButton.svelte'
import { GooButton as ExportedGooButton } from '../index.js'

describe('GooButton', () => {
	it('exports the Svelte component as the button surface', () => {
		expect(ExportedGooButton).toBe(GooButton)
	})

	it('renders a native button without a goo-button custom element', () => {
		const { container } = render(GooButton, {
			props: {
				value: 'Save',
				variant: 'primary'
			}
		})

		const button = container.querySelector('button.goo-button')

		expect(container.querySelector('goo-button')).toBeNull()
		expect(button?.getAttribute('variant')).toBe('primary')
		expect(button?.textContent).toContain('Save')
	})

	it('emits lowercase callback props for click and toggle changes', async() => {
		const onclick = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooButton, {
			props: {
				value: 'Bold',
				toggle: true,
				onclick,
				onchange
			}
		})

		const button = container.querySelector('button.goo-button') as HTMLButtonElement
		await fireEvent.click(button)

		expect(onclick).toHaveBeenCalledOnce()
		expect(onchange).toHaveBeenCalledWith(true, false)
		expect(button.getAttribute('aria-pressed')).toBe('true')
		expect(button.classList.contains('goo-button--selected')).toBe(true)
	})
})
