import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooInput from '../GooInput.svelte'
import GooNumber from '../GooNumber.svelte'
import { GooInput as ExportedGooInput, GooNumber as ExportedGooNumber } from '../index.js'

describe('GooInput', () => {
	it('exports native Svelte input components from the package subpath', () => {
		expect(ExportedGooInput).toBe(GooInput)
		expect(ExportedGooNumber).toBe(GooNumber)
	})

	it('renders text input without a custom element host', () => {
		const { container } = render(GooInput, {
			props: {
				value: 'Hello',
				placeholder: 'Name'
			}
		})

		const input = container.querySelector<HTMLInputElement>('.goo-input__content')

		expect(container.querySelector('goo-input')).toBeNull()
		expect(input?.value).toBe('Hello')
		expect(input?.placeholder).toBe('Name')
	})

	it('emits text input and change callbacks', async() => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooInput, {
			props: {
				value: 'old',
				oninput,
				onchange
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-input__content')!

		await fireEvent.focus(input)
		await fireEvent.input(input, { target: { value: 'draft' } })
		await fireEvent.blur(input)

		expect(oninput).toHaveBeenCalledExactlyOnceWith('draft', 'old')
		expect(onchange).toHaveBeenCalledExactlyOnceWith('draft', 'old')
	})

	it('marks edited text inputs for value-change feedback', async() => {
		const { container } = render(GooInput, {
			props: {
				value: 'old'
			}
		})
		const root = container.querySelector<HTMLElement>('.goo-input')!
		const input = container.querySelector<HTMLInputElement>('.goo-input__content')!

		await fireEvent.input(input, { target: { value: 'draft' } })
		await tick()

		expect(root.classList.contains('goo-input--changed')).toBe(true)
	})
})

describe('GooNumber', () => {
	it('renders number input without a custom element host', () => {
		const { container } = render(GooNumber, {
			props: {
				value: 12,
				min: 0,
				max: 100,
				unit: '%'
			}
		})

		const input = container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(container.querySelector('goo-number')).toBeNull()
		expect(input?.value).toBe('12%')
		expect(input?.getAttribute('aria-valuenow')).toBe('12')
	})

	it('passes input ids and names to the native number input', () => {
		const { container } = render(GooNumber, {
			props: {
				inputId: 'crop-width-input',
				name: 'crop-width',
				value: 12
			}
		})

		const input = container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(input?.id).toBe('crop-width-input')
		expect(input?.name).toBe('crop-width')
	})

	it('preserves decimal precision from float steps', () => {
		const { container } = render(GooNumber, {
			props: {
				value: 0.501,
				min: 0,
				max: 1,
				step: 0.001
			}
		})

		const input = container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(input?.value).toBe('0.501')
		expect(input?.getAttribute('aria-valuenow')).toBe('0.501')
	})

	it('formats normalized percentages using step precision', () => {
		const { container } = render(GooNumber, {
			props: {
				value: 0.976,
				min: 0,
				max: 1,
				step: 0.001,
				unit: '%'
			}
		})

		const input = container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(input?.value).toBe('97.6%')
		expect(input?.getAttribute('aria-valuenow')).toBe('0.976')
	})

	it('formats stepped pixel values without padded decimals', () => {
		const { container } = render(GooNumber, {
			props: {
				value: 2,
				min: 0,
				max: 20,
				step: 0.25,
				unit: 'px'
			}
		})

		const input = container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(input?.value).toBe('2px')
		expect(input?.getAttribute('aria-valuenow')).toBe('2')
	})

	it('emits number input and change callbacks', async() => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooNumber, {
			props: {
				value: 4,
				oninput,
				onchange
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-number__content')!

		await fireEvent.focus(input)
		await fireEvent.input(input, { target: { value: '8' } })
		await fireEvent.blur(input)

		expect(oninput).toHaveBeenCalledExactlyOnceWith(8, 4)
		expect(onchange).toHaveBeenCalledExactlyOnceWith(8, 4)
	})

	it('marks stepped number inputs as changed', async() => {
		const { container } = render(GooNumber, {
			props: {
				value: 4
			}
		})
		const root = container.querySelector<HTMLElement>('.goo-number')!
		const input = container.querySelector<HTMLInputElement>('.goo-number__content')!
		const upButton = container.querySelector<HTMLButtonElement>('.goo-number__arrow--up')!
		await tick()

		expect(input.value).toBe('4.00')

		await fireEvent.pointerDown(upButton)
		await tick()

		expect(root.classList.contains('goo-number--changed')).toBe(true)

		await fireEvent.pointerUp(upButton)
		await tick()

		expect(upButton.classList.contains('goo-number__arrow--pressed')).toBe(false)
	})
})
