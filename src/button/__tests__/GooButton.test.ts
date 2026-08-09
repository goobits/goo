import { fireEvent, render } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooButton from '../GooButton.svelte'
import type { GooButtonElement } from '../types.ts'

describe('GooButton', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
	})

	it('renders a native button without a goo-button custom element', () => {
		const { container } = render(GooButton, {
			props: {
				label: 'Save',
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
				label: 'Bold',
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
				label: 'Billing',
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
				label: 'Save',
				name: 'intent'
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

	it('maps fullRow to the full-row button class', () => {
		const { container } = render(GooButton, {
			props: {
				fullRow: true,
				label: 'Continue'
			}
		})

		const button = container.querySelector('button.goo-button') as HTMLButtonElement

		expect(button.classList.contains('goo-button--full-row')).toBe(true)
	})

	it('renders quiet compact square icon controls', () => {
		const { container } = render(GooButton, {
			props: {
				ariaLabel: 'Close',
				size: 'compact',
				square: true,
				variant: 'quiet'
			}
		})

		const button = container.querySelector<HTMLButtonElement>('button.goo-button')!

		expect(button.getAttribute('aria-label')).toBe('Close')
		expect(button.getAttribute('size')).toBe('compact')
		expect(button.getAttribute('variant')).toBe('quiet')
		expect(button.hasAttribute('square')).toBe(true)
	})

	it('targets an external form', () => {
		const { container } = render(GooButton, {
			props: {
				form: 'delete-form',
				label: 'Delete',
				type: 'submit'
			}
		})

		const button = container.querySelector('button.goo-button') as HTMLButtonElement

		expect(button.form).toBeNull()
		expect(button.getAttribute('form')).toBe('delete-form')
	})

	it('binds the rendered native element and forwards hover callbacks', async() => {
		let element: GooButtonElement | null = null
		const onmouseenter = vi.fn()
		const onmouseleave = vi.fn()
		render(GooButton, {
			props: {
				label: 'Preview',
				onmouseenter,
				onmouseleave,
				get element() {
					return element
				},
				set element(value) {
					element = value
				}
			}
		})

		await fireEvent.mouseEnter(element!)
		await fireEvent.mouseLeave(element!)

		expect(element).toBeInstanceOf(HTMLButtonElement)
		expect(onmouseenter).toHaveBeenCalledOnce()
		expect(onmouseleave).toHaveBeenCalledOnce()
	})

	it('keeps title native and renders tooltip as Goo chrome with an arrow', async() => {
		const { container } = render(GooButton, {
			props: {
				label: 'Save',
				tooltip: 'Save changes'
			}
		})
		const button = container.querySelector<HTMLButtonElement>('button.goo-button')!

		expect(button.hasAttribute('title')).toBe(false)

		await fireEvent.mouseEnter(button)
		await new Promise(resolve => setTimeout(resolve, 450))

		expect(document.querySelector('.goo-popout.goo-tooltip')?.textContent).toContain('Save changes')
		expect(document.querySelector('.goo-popout.goo-tooltip .goo-popout__arrow')).not.toBeNull()
	})
})
