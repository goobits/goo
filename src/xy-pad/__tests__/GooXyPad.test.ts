import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import GooXyPad from '../GooXyPad.svelte'
import type { GooXyPadElement } from '../types.ts'

describe('GooXyPad', () => {
	it('renders a native XY pad with precision number fields', () => {
		const { container } = render(GooXyPad, {
			props: {
				label: 'Scatter',
				value: { x: 10, y: -20 },
				min: -100,
				max: 100,
				unit: 'px'
			}
		})

		expect(container.querySelector('goo-xy-pad')).toBeNull()
		expect(container.querySelector('.goo-xy-pad')).not.toBeNull()
		expect(container.querySelector('.goo-xy-pad__surface')?.getAttribute('aria-valuetext')).toBe('X 10, Y -20')
		expect([ ...container.querySelectorAll<HTMLInputElement>('.goo-number__content') ].map(input => input.value)).toEqual([ '10', '-20' ])
	})

	it('binds the native root API for imperative updates', async() => {
		let element: GooXyPadElement | null = null
		render(GooXyPad, {
			props: {
				value: { x: 1, y: 2 },
				get element() {
					return element
				},
				set element(value) {
					element = value
				}
			}
		})
		await tick()

		element?.setValue({ x: 20, y: -15 })

		expect(element?.getValue()).toEqual({ x: 20, y: -15 })
	})

	it('emits input while dragging and change on release', () => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooXyPad, {
			props: {
				value: { x: 0, y: 0 },
				min: -100,
				max: 100,
				oninput,
				onchange
			}
		})
		const surface = container.querySelector<HTMLButtonElement>('.goo-xy-pad__surface')!
		surface.getBoundingClientRect = () => rect(0, 0, 100, 100)
		surface.setPointerCapture = vi.fn()
		surface.releasePointerCapture = vi.fn()

		surface.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4, clientX: 75, clientY: 25 }))
		surface.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, clientX: 100, clientY: 100 }))
		surface.dispatchEvent(pointerEvent('pointerup', { pointerId: 4, clientX: 100, clientY: 100 }))

		expect(surface.setPointerCapture).toHaveBeenCalledExactlyOnceWith(4)
		expect(surface.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(4)
		expect(oninput).toHaveBeenCalled()
		expect(oninput.mock.calls.at(-1)?.[0]).toEqual({ x: 100, y: -100 })
		expect(onchange).toHaveBeenCalledOnce()
		expect(onchange.mock.calls[0]?.[0]).toEqual({ x: 100, y: -100 })
	})

	it('updates individual axes from number inputs', async() => {
		const onchange = vi.fn()
		const { container } = render(GooXyPad, {
			props: {
				value: { x: 0, y: 0 },
				min: -100,
				max: 100,
				onchange
			}
		})
		const [ xInput ] = [ ...container.querySelectorAll<HTMLInputElement>('.goo-number__content') ]

		await fireEvent.focus(xInput!)
		await fireEvent.input(xInput!, { target: { value: '48' } })
		await fireEvent.blur(xInput!)

		expect(onchange).toHaveBeenCalled()
		expect(onchange.mock.calls.at(-1)?.[0]).toEqual({ x: 48, y: 0 })
	})

	it('supports keyboard nudging and center reset', async() => {
		const onchange = vi.fn()
		const { container } = render(GooXyPad, {
			props: {
				value: { x: 0, y: 0 },
				min: -10,
				max: 10,
				step: 1,
				onchange
			}
		})
		const surface = container.querySelector<HTMLButtonElement>('.goo-xy-pad__surface')!
		const reset = container.querySelector<HTMLButtonElement>('.goo-xy-pad__reset')!

		await fireEvent.keyDown(surface, { key: 'ArrowRight' })
		await fireEvent.keyDown(surface, { key: 'ArrowUp', shiftKey: true })
		await fireEvent.click(reset)

		expect(onchange.mock.calls[0]?.[0]).toEqual({ x: 1, y: 0 })
		expect(onchange.mock.calls[1]?.[0]).toEqual({ x: 1, y: 10 })
		expect(onchange.mock.calls.at(-1)?.[0]).toEqual({ x: 0, y: 0 })
	})
})

function rect(x: number, y: number, width: number, height: number): DOMRect {
	return {
		bottom: y + height,
		height,
		left: x,
		right: x + width,
		toJSON: () => ({}),
		top: y,
		width,
		x,
		y
	} as DOMRect
}
