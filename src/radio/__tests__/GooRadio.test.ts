import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooRadio from '../GooRadio.svelte'
import GooRadioGroup from '../GooRadioGroup.svelte'

describe('GooRadio', () => {
	it('renders a radio button without a custom element host', () => {
		const { container } = render(GooRadio, {
			props: {
				checked: true,
				label: 'Option A',
				value: 'a'
			}
		})

		const radio = container.querySelector<HTMLButtonElement>('.goo-radio')

		expect(container.querySelector('goo-radio')).toBeNull()
		expect(radio?.getAttribute('aria-checked')).toBe('true')
		expect(radio?.textContent).toContain('Option A')
	})

	it('supports silent imperative checks', async() => {
		const onchange = vi.fn()
		const { container } = render(GooRadio, {
			props: {
				label: 'Option A',
				value: 'a',
				onchange
			}
		})
		await tick()

		const radio = container.querySelector<HTMLButtonElement & { check(options?: { silent?: boolean }): void }>('.goo-radio')!
		radio.check({ silent: true })
		await tick()

		expect(radio.getAttribute('aria-checked')).toBe('true')
		expect(onchange).not.toHaveBeenCalled()
	})

	it('prevents default browser handling for custom keyboard activation', () => {
		const { container } = render(GooRadio, {
			props: {
				label: 'Option A',
				value: 'a'
			}
		})
		const radio = container.querySelector<HTMLButtonElement>('.goo-radio')!

		for (const key of [ 'Enter', ' ' ]) {
			const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
			radio.dispatchEvent(event)

			expect(event.defaultPrevented).toBe(true)
		}
	})
})

describe('GooRadioGroup', () => {
	it('renders without options without self-triggering value sync', async() => {
		const { container } = render(GooRadioGroup, {
			props: {
				name: 'empty-radio-group'
			}
		})
		await tick()

		const group = container.querySelector('.goo-radio-group')
		const hiddenInput = container.querySelector<HTMLInputElement>('.goo-radio-group__input')

		expect(group?.getAttribute('role')).toBe('radiogroup')
		expect(group?.querySelector('.goo-radio')).toBeNull()
		expect(hiddenInput?.value).toBe('')
		expect(hiddenInput?.disabled).toBe(true)
	})

	it('renders option radios without raw HTML hydration', () => {
		const { container } = render(GooRadioGroup, {
			props: {
				value: 'b',
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B' }
				]
			}
		})

		const group = container.querySelector('.goo-radio-group')

		expect(container.querySelector('goo-radio-group')).toBeNull()
		expect(group?.getAttribute('role')).toBe('radiogroup')
		expect(group?.getAttribute('tabindex')).toBeNull()
		expect(group?.querySelector<HTMLButtonElement>('.goo-radio[value="a"]')?.getAttribute('tabindex')).toBe('-1')
		expect(group?.querySelector<HTMLButtonElement>('.goo-radio[value="b"]')?.getAttribute('tabindex')).toBe('0')
		expect(group?.querySelector<HTMLButtonElement>('.goo-radio[value="b"]')?.classList.contains('goo-radio--checked')).toBe(true)
	})

	it('emits value changes from Svelte options', async() => {
		const onchange = vi.fn()
		const { container } = render(GooRadioGroup, {
			props: {
				value: 'a',
				onchange,
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B' }
				]
			}
		})

		await fireEvent.click(container.querySelector<HTMLButtonElement>('.goo-radio[value="b"]')!)

		expect(onchange).toHaveBeenCalledExactlyOnceWith('b', 'a')
		expect(container.querySelector<HTMLButtonElement>('.goo-radio[value="a"]')?.classList.contains('goo-radio--checked')).toBe(false)
		expect(container.querySelector<HTMLButtonElement>('.goo-radio[value="b"]')?.classList.contains('goo-radio--checked')).toBe(true)
	})

	it('moves real DOM focus and selection with arrow keys', async() => {
		const onchange = vi.fn()
		const { container } = render(GooRadioGroup, {
			props: {
				value: 'a',
				onchange,
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B' }
				]
			}
		})
		const radioA = container.querySelector<HTMLButtonElement>('.goo-radio[value="a"]')!
		const radioB = container.querySelector<HTMLButtonElement>('.goo-radio[value="b"]')!

		radioA.focus()
		await fireEvent.keyDown(radioA, { key: 'ArrowDown' })
		await tick()

		expect(document.activeElement).toBe(radioB)
		expect(radioA.getAttribute('tabindex')).toBe('-1')
		expect(radioB.getAttribute('tabindex')).toBe('0')
		expect(radioB.classList.contains('goo-radio--checked')).toBe(true)
		expect(onchange).toHaveBeenCalledExactlyOnceWith('b', 'a')
	})
})
