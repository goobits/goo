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
				'aria-label': 'Billing portal',
				download: 'invoice.pdf',
				href: '/billing',
				hreflang: 'en',
				referrerpolicy: 'no-referrer',
				value: 'Billing',
				variant: 'secondary'
			}
		})

		const link = container.querySelector('a.goo-button')

		expect(container.querySelector('button')).toBeNull()
		expect(link?.getAttribute('aria-label')).toBe('Billing portal')
		expect(link?.getAttribute('download')).toBe('invoice.pdf')
		expect(link?.getAttribute('href')).toBe('/billing')
		expect(link?.getAttribute('hreflang')).toBe('en')
		expect(link?.getAttribute('referrerpolicy')).toBe('no-referrer')
		expect(link?.getAttribute('variant')).toBe('secondary')
	})

	it('forwards native form attributes to button elements', () => {
		const { container } = render(GooButton, {
			props: {
				autofocus: true,
				form: 'profile',
				formaction: '/profile',
				formmethod: 'post',
				formValue: 'save',
				name: 'intent',
				value: 'Save'
			}
		})

		const button = container.querySelector('button.goo-button')

		expect(button?.getAttribute('form')).toBe('profile')
		expect(button?.getAttribute('formaction')).toBe('/profile')
		expect(button?.getAttribute('formmethod')).toBe('post')
		expect(button?.getAttribute('name')).toBe('intent')
		expect(button?.getAttribute('value')).toBe('save')
		expect(button?.hasAttribute('autofocus')).toBe(true)
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
