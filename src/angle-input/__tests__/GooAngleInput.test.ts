import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import GooAngleInput from '../GooAngleInput.svelte'
import type { GooAngleInputElement } from '../types.ts'

describe('GooAngleInput', () => {
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
		expect(container.querySelector<HTMLInputElement>('.goo-number__content')?.value).toBe('25')
		expect(container.querySelector<HTMLElement>('.goo-number__unit')?.textContent).toBe('°')
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

	it('disables the hidden form value when the angle input is disabled', () => {
		const { container } = render(GooAngleInput, {
			props: {
				name: 'angle',
				value: 20,
				disabled: true
			}
		})

		expect(container.querySelector<HTMLInputElement>('input[data-goo-angle-input-field]')?.disabled).toBe(true)
	})

	it('ignores non-primary pointer drags', () => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooAngleInput, {
			props: {
				value: 0,
				oninput,
				onchange
			}
		})
		const track = container.querySelector<HTMLButtonElement>('.goo-angle-input__track')!
		track.getBoundingClientRect = () => rect(0, 0, 100, 100)
		track.setPointerCapture = vi.fn()

		track.dispatchEvent(pointerEvent('pointerdown', { button: 2, buttons: 2, pointerId: 8, clientX: 50, clientY: 0 }))
		track.dispatchEvent(pointerEvent('pointermove', { button: 2, buttons: 2, pointerId: 8, clientX: 100, clientY: 50 }))
		track.dispatchEvent(pointerEvent('pointerup', { button: 2, buttons: 0, pointerId: 8, clientX: 100, clientY: 50 }))

		expect(track.setPointerCapture).not.toHaveBeenCalled()
		expect(oninput).not.toHaveBeenCalled()
		expect(onchange).not.toHaveBeenCalled()
	})

	it('cleans up canceled pointer drags without committing a change', () => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooAngleInput, {
			props: {
				value: 0,
				oninput,
				onchange
			}
		})
		const track = container.querySelector<HTMLButtonElement>('.goo-angle-input__track')!
		track.getBoundingClientRect = () => rect(0, 0, 100, 100)
		track.setPointerCapture = vi.fn()
		track.releasePointerCapture = vi.fn()

		track.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4, pointerType: 'pen', clientX: 50, clientY: 0 }))
		track.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, pointerType: 'pen', clientX: 100, clientY: 50 }))
		track.dispatchEvent(pointerEvent('pointercancel', { pointerId: 4, pointerType: 'pen', clientX: 100, clientY: 50 }))
		track.dispatchEvent(pointerEvent('pointerup', { pointerId: 4, pointerType: 'pen', clientX: 100, clientY: 50 }))

		expect(track.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(4)
		expect(oninput).toHaveBeenCalled()
		expect(onchange).not.toHaveBeenCalled()
	})

	it('changes the visual dial from keyboard arrows and contains the event', () => {
		const onchange = vi.fn()
		const { container } = render(GooAngleInput, {
			props: {
				value: 20,
				onchange
			}
		})
		const track = container.querySelector<HTMLButtonElement>('.goo-angle-input__track')!
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		const event = dispatchKey(track, 'ArrowRight')

		expect(event.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(onchange.mock.calls[0]?.[0]).toBe(21)
	})
})

function dispatchKey(element: HTMLElement, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key
	})
	element.dispatchEvent(event)
	return event
}

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
