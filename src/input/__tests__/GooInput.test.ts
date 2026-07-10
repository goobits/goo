import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import GooInput from '../GooInput.svelte'
import GooNumber from '../GooNumber.svelte'

describe('GooInput', () => {
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

	it('contains handled editor keys without blocking native typing keys', () => {
		const { container } = render(GooInput, {
			props: {
				value: 'draft'
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-input__content')!
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		const typingEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'a' })
		input.dispatchEvent(typingEvent)

		expect(typingEvent.defaultPrevented).toBe(false)
		expect(parentKeydown).not.toHaveBeenCalled()

		const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
		input.dispatchEvent(enterEvent)

		expect(enterEvent.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
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
		const unit = container.querySelector<HTMLElement>('.goo-number__unit')

		expect(container.querySelector('goo-number')).toBeNull()
		expect(input?.value).toBe('12')
		expect(unit?.textContent).toBe('%')
		expect(unit?.getAttribute('aria-hidden')).toBe('true')
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
		const unit = container.querySelector<HTMLElement>('.goo-number__unit')

		expect(input?.value).toBe('97.6')
		expect(unit?.textContent).toBe('%')
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
		const unit = container.querySelector<HTMLElement>('.goo-number__unit')

		expect(input?.value).toBe('2')
		expect(unit?.textContent).toBe('px')
		expect(input?.getAttribute('aria-valuenow')).toBe('2')
	})

	it('formats degrees and radians without changing their stored precision', () => {
		const degrees = render(GooNumber, {
			props: {
				value: 12.3456,
				unit: 'degree'
			}
		})
		const degreeInput = degrees.container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(degreeInput?.value).toBe('12.3')
		expect(degreeInput?.getAttribute('aria-valuenow')).toBe('12.3456')
		degrees.unmount()

		const radians = render(GooNumber, {
			props: {
				value: 1.2345,
				unit: 'radian'
			}
		})
		const radianInput = radians.container.querySelector<HTMLInputElement>('.goo-number__content')

		expect(radianInput?.value).toBe('1.23')
		expect(radianInput?.getAttribute('aria-valuenow')).toBe('1.2345')
	})

	it('sizes unit suffix spacing from the rendered suffix', () => {
		const { container } = render(GooNumber, {
			props: {
				value: 12,
				unit: '%',
				style: 'width: 48px'
			}
		})

		const root = container.querySelector<HTMLElement>('.goo-number')

		expect(root?.style.width).toBe('48px')
		expect(root?.style.getPropertyValue('--goo-number-unit-width')).toBe('0.62em')
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

	it('contains handled number keys inside the input', () => {
		const onenter = vi.fn()
		const { container } = render(GooNumber, {
			props: {
				value: 4,
				onenter
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-number__content')!
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
		input.dispatchEvent(enterEvent)

		expect(enterEvent.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(onenter).toHaveBeenCalledExactlyOnceWith()

		const arrowEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowUp' })
		input.dispatchEvent(arrowEvent)

		expect(arrowEvent.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
	})

	it('supports spinbutton keyboard stepping and bounds', async() => {
		const oninput = vi.fn()
		const { container } = render(GooNumber, {
			props: {
				value: 4,
				min: 0,
				max: 10,
				step: 0.5,
				oninput
			}
		})
		const input = container.querySelector<HTMLInputElement>('.goo-number__content')!

		input.dispatchEvent(new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowUp'
		}))
		await tick()
		expect(input.getAttribute('aria-valuenow')).toBe('4.5')
		expect(oninput).toHaveBeenLastCalledWith(4.5, 4)

		input.dispatchEvent(new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'PageUp'
		}))
		await tick()
		expect(input.getAttribute('aria-valuenow')).toBe('10')
		expect(oninput).toHaveBeenLastCalledWith(10, 4.5)

		input.dispatchEvent(new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'Home'
		}))
		await tick()
		expect(input.getAttribute('aria-valuenow')).toBe('0')
		expect(oninput).toHaveBeenLastCalledWith(0, 10)

		input.dispatchEvent(new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'End'
		}))
		await tick()
		expect(input.getAttribute('aria-valuenow')).toBe('10')
		expect(oninput).toHaveBeenLastCalledWith(10, 0)
	})

	it('keeps only one active pointer-hold repeat for number arrows', () => {
		vi.useFakeTimers()
		try {
			const oninput = vi.fn()
			const { container } = render(GooNumber, {
				props: {
					value: 4,
					oninput
				}
			})
			const upButton = container.querySelector<HTMLButtonElement>('.goo-number__arrow--up')!

			upButton.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }))
			upButton.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2 }))
			vi.advanceTimersByTime(300)

			expect(oninput).toHaveBeenCalledTimes(3)
		} finally {
			vi.useRealTimers()
		}
	})

	it('ignores non-primary number arrow pointer holds', () => {
		vi.useFakeTimers()
		try {
			const oninput = vi.fn()
			const { container } = render(GooNumber, {
				props: {
					value: 4,
					oninput
				}
			})
			const upButton = container.querySelector<HTMLButtonElement>('.goo-number__arrow--up')!

			upButton.dispatchEvent(pointerEvent('pointerdown', { button: 2, buttons: 2, pointerId: 3 }))
			vi.advanceTimersByTime(1000)

			expect(oninput).not.toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('stops number arrow pointer holds when disabled', async() => {
		vi.useFakeTimers()
		try {
			const oninput = vi.fn()
			const { container, rerender } = render(GooNumber, {
				props: {
					value: 4,
					oninput
				}
			})
			const upButton = container.querySelector<HTMLButtonElement>('.goo-number__arrow--up')!

			upButton.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }))
			await rerender({
				value: 4,
				disabled: true,
				oninput
			})
			vi.advanceTimersByTime(1000)

			expect(oninput).toHaveBeenCalledOnce()
		} finally {
			vi.useRealTimers()
		}
	})
})
