import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooButton from '../GooButton.svelte'

describe('GooButton', () => {
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

	it('renders an anchor when href is provided', () => {
		const { container } = render(GooButton, {
			props: {
				href: '/billing',
				value: 'Billing',
				variant: 'secondary'
			}
		})

		const link = container.querySelector('a.goo-button')

		expect(container.querySelector('button')).toBeNull()
		expect(link?.getAttribute('href')).toBe('/billing')
		expect(link?.getAttribute('variant')).toBe('secondary')
	})

	it('maps block to the full-row button class', () => {
		const { container } = render(GooButton, {
			props: {
				block: true,
				value: 'Continue'
			}
		})

		const button = container.querySelector('button.goo-button') as HTMLButtonElement

		expect(button.classList.contains('goo-button--block')).toBe(true)
		expect(button.classList.contains('goo-button--full-row')).toBe(true)
	})
})
