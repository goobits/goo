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

	it('targets an external form', () => {
		const { container } = render(GooButton, {
			props: {
				form: 'delete-form',
				type: 'submit',
				value: 'Delete'
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
				value: 'Preview',
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
				tooltip: 'Save changes',
				value: 'Save'
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
