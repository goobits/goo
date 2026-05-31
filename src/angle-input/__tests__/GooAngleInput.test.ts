import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooAngleInput from '../GooAngleInput.svelte'
import { GooAngleInput as ExportedGooAngleInput } from '../index.js'
import type { GooAngleInputElement } from '../types.js'

describe('GooAngleInput', () => {
	it('exports the native Svelte component from the package subpath', () => {
		expect(ExportedGooAngleInput).toBe(GooAngleInput)
	})

	it('renders a native angle input surface without custom element tags', () => {
		const { container } = render(GooAngleInput, {
			props: {
				value: 25,
				unit: 'degree'
			}
		})

		expect(container.querySelector('goo-angle-input')).toBeNull()
		expect(container.querySelector('.goo-angle-input')?.getAttribute('unit')).toBe('degree')
		expect(container.querySelector('.goo-angle-input__track')).not.toBeNull()
		expect(container.querySelector('.goo-angle-input__handle')).not.toBeNull()
		expect(container.querySelector<HTMLInputElement>('.goo-number__content')?.value).toBe('25°')
	})

	it('binds the native root API for imperative updates', async() => {
		let element: GooAngleInputElement | null = null
		render(GooAngleInput, {
			props: {
				value: 25,
				get element() {
					return element
				},
				set element(value) {
					element = value
				}
			}
		})
		await tick()

		element?.setValue(70)

		expect(element?.getValue()).toBe(70)
	})

	it('emits value callbacks from the Svelte number input', async() => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooAngleInput, {
			props: {
				value: 20,
				oninput,
				onchange
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-number__content')!

		await fireEvent.focus(input)
		await fireEvent.input(input, { target: { value: '80 degree' } })
		await fireEvent.blur(input)

		expect(oninput).toHaveBeenCalledOnce()
		expect(oninput.mock.calls[0]?.[0]).toBe(80)
		expect(onchange).toHaveBeenCalledOnce()
		expect(onchange.mock.calls[0]?.[0]).toBe(80)
	})
})
