import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooColor from '../GooColor.svelte'
import { GooColor as ExportedGooColor } from '../index.ts'
import type { GooColorElement } from '../types.ts'

describe('GooColor', () => {
	it('exports the native Svelte component from the package subpath', () => {
		expect(ExportedGooColor).toBe(GooColor)
	})

	it('renders a native color surface without custom element tags', () => {
		const { container } = render(GooColor, {
			props: {
				value: '#6366f1'
			}
		})

		expect(container.querySelector('goo-color')).toBeNull()
		expect(container.querySelector('goo-color-swatch')).toBeNull()
		expect(container.querySelector('.goo-color')?.getAttribute('value')).toBe('#6366f1')
		expect(container.querySelector<HTMLInputElement>('.goo-color__input')?.value).toBe('#6366f1')
	})

	it('can render without the native browser color picker', () => {
		const { container } = render(GooColor, {
			props: {
				value: '#6366f1',
				nativePicker: false
			}
		})

		expect(container.querySelector<HTMLInputElement>('.goo-color__picker')).toBeNull()
		expect(container.querySelector('.goo-color__swatch--static')).not.toBeNull()
		expect(container.querySelector<HTMLInputElement>('.goo-color__input')?.value).toBe('#6366f1')
	})

	it('binds the native root API for imperative updates', async() => {
		let element: GooColorElement | null = null
		render(GooColor, {
			props: {
				value: '#000000',
				get element() {
					return element
				},
				set element(value) {
					element = value
				}
			}
		})
		await tick()

		element?.setValue('#ff0000')

		expect(element?.getValue()).toBe('#ff0000')
	})

	it('emits Svelte callbacks with color values', async() => {
		const onchange = vi.fn()
		const { container } = render(GooColor, {
			props: {
				value: '#000000',
				onchange
			}
		})
		const color = container.querySelector<GooColorElement>('.goo-color')!

		color.setValue('#00ff00')
		await tick()

		expect(onchange).toHaveBeenCalledOnce()
		expect(onchange.mock.calls[0]?.[0]).toBe('#00ff00')
	})

	it('normalizes CSS color names through the shared color parser', () => {
		const { container } = render(GooColor, {
			props: {
				value: 'rebeccapurple'
			}
		})

		expect(container.querySelector<GooColorElement>('.goo-color')?.getValue()).toBe('#663399')
	})

	it('preserves alpha when normalizing CSS colors', () => {
		const { container } = render(GooColor, {
			props: {
				value: 'rgba(255, 0, 0, 0.5)',
				alpha: true
			}
		})

		expect(container.querySelector<GooColorElement>('.goo-color')?.getValue()).toBe('#ff000080')
	})

	it('normalizes HSLA colors through the shared color parser', () => {
		const { container } = render(GooColor, {
			props: {
				value: 'hsla(120, 100%, 50%, 25%)',
				alpha: true
			}
		})

		expect(container.querySelector<GooColorElement>('.goo-color')?.getValue()).toBe('#00ff0040')
	})

	it('normalizes short hex alpha through the shared color parser', () => {
		const { container } = render(GooColor, {
			props: {
				value: '#0f08',
				alpha: true
			}
		})

		expect(container.querySelector<GooColorElement>('.goo-color')?.getValue()).toBe('#00ff0088')
	})

	it('falls back to black for invalid color values', () => {
		const { container } = render(GooColor, {
			props: {
				value: 'not-a-color'
			}
		})

		expect(container.querySelector<GooColorElement>('.goo-color')?.getValue()).toBe('#000000')
	})

	it('emits input and change from text edits', async() => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooColor, {
			props: {
				value: '#123456',
				oninput,
				onchange
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-color__input')!

		await fireEvent.input(input, { target: { value: '#654321' } })
		await fireEvent.change(input, { target: { value: '#654321' } })

		expect(oninput).toHaveBeenCalledOnce()
		expect(oninput.mock.calls[0]?.[0]).toBe('#654321')
		expect(onchange).toHaveBeenCalledOnce()
		expect(onchange.mock.calls[0]?.[0]).toBe('#654321')
	})

	it('does not leak native child input/change events through the root surface', async() => {
		const { container } = render(GooColor, {
			props: {
				value: '#123456'
			}
		})
		const color = container.querySelector<GooColorElement>('.goo-color')!
		const input = container.querySelector<HTMLInputElement>('.goo-color__input')!
		const onRootInput = vi.fn()
		const onRootChange = vi.fn()
		color.addEventListener('input', onRootInput)
		color.addEventListener('change', onRootChange)

		await fireEvent.input(input, { target: { value: '#654321' } })
		await fireEvent.change(input, { target: { value: '#654321' } })

		expect(onRootInput).toHaveBeenCalled()
		for (const [ event ] of onRootInput.mock.calls) {
			expect(event).toMatchObject({
				detail: expect.objectContaining({ value: '#654321' }),
				target: color
			})
		}
		expect(onRootChange).toHaveBeenCalledOnce()
		expect(onRootChange.mock.calls[0]?.[0]).toMatchObject({
			detail: expect.objectContaining({ value: '#654321' }),
			target: color
		})
	})
})
