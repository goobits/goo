import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooRadio from '../GooRadio.svelte'
import GooRadioGroup from '../GooRadioGroup.svelte'
import { GooRadio as ExportedGooRadio, GooRadioGroup as ExportedGooRadioGroup } from '../index.js'

describe('GooRadio', () => {
	it('exports native Svelte components from the package subpath', () => {
		expect(ExportedGooRadio).toBe(GooRadio)
		expect(ExportedGooRadioGroup).toBe(GooRadioGroup)
	})

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
})

describe('GooRadioGroup', () => {
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
})
