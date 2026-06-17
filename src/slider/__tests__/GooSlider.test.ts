import { readFileSync } from 'node:fs'

import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import { createSliderPrimitiveField } from '../_createSliderPrimitiveField.ts'
import GooSlider from '../GooSlider.svelte'
import type { GooSliderElement } from '../types.ts'

const sliderCss = readFileSync('src/slider/GooSlider.css', 'utf8')

describe('GooSlider', () => {
	it('renders a native slider surface without custom element tags', () => {
		const { container } = render(GooSlider, {
			props: {
				value: 25,
				min: 0,
				max: 100,
				unit: '%'
			}
		})

		expect(container.querySelector('goo-slider')).toBeNull()
		expect(container.querySelector('.goo-slider')?.getAttribute('unit')).toBe('%')
		expect(container.querySelector('.goo-slider__thumb')).not.toBeNull()
	})

	it('exposes value-fill styling hooks without inline thumb transforms', () => {
		const { container } = render(GooSlider, {
			props: {
				value: 25,
				min: 0,
				max: 100
			}
		})
		const slider = container.querySelector<HTMLElement>('.goo-slider')!
		const thumb = container.querySelector<HTMLElement>('.goo-slider__thumb')!

		expect(slider.classList.contains('goo-slider--value-fill')).toBe(true)
		expect(slider.style.getPropertyValue('--goo-slider-value-pct').trim()).toBe('25%')
		expect(slider.style.getPropertyValue('--goo-slider-fill-pct').trim()).toBe('25%')
		expect(thumb.style.left).toBe('25%')
		expect(thumb.style.transform).toBe('')
	})

	it('binds the native root API for imperative updates', async() => {
		let element: GooSliderElement | null = null
		render(GooSlider, {
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

	it('updates primitive field values without remounting the slider', async() => {
		const field = createSliderPrimitiveField({ value: 25, min: 0, max: 100 })
		document.body.appendChild(field)
		await tick()

		const slider = field.querySelector<GooSliderElement>('.goo-slider')!
		field.setValue(70)
		await tick()

		expect(field.querySelector('.goo-slider')).toBe(slider)
		expect(field.getValue()).toBe(70)

		field.destroy()
		field.destroy()
		field.setValue(20)

		expect(field.querySelector('.goo-slider')).toBeNull()
	})

	it('emits Svelte callbacks with numeric values', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 20,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		slider.setValue(80)
		await tick()

		expect(onchange).toHaveBeenCalledOnce()
		expect(onchange.mock.calls[0]?.[0]).toBe(80)
	})

	it('does not emit when setting the current value again', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 20,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		slider.setValue(20)
		await tick()

		expect(onchange).not.toHaveBeenCalled()
		expect(slider.getValue()).toBe(20)
	})

	it('updates value from keyboard interaction', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 20,
				step: 5,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		await fireEvent.keyDown(slider, { key: 'ArrowRight' })

		expect(slider.getValue()).toBe(25)
		expect(onchange.mock.calls[0]?.[0]).toBe(25)
	})

	it('uses float step increments as step sizes', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 0.5,
				min: 0,
				max: 1,
				step: 0.001,
				unit: 'float',
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		await fireEvent.keyDown(slider, { key: 'ArrowRight' })

		expect(slider.getValue()).toBe(0.501)
		expect(onchange.mock.calls[0]?.[0]).toBe(0.501)
	})

	it('coerces string numeric bounds and steps from runtime attributes', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: '0.5',
				min: '0',
				max: '1',
				step: '0.001',
				unit: 'float',
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		await fireEvent.keyDown(slider, { key: 'ArrowRight' })

		expect(slider.getValue()).toBe(0.501)
		expect(onchange.mock.calls[0]?.[0]).toBe(0.501)
	})

	it('does not emit for clamped no-op keyboard updates', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 100,
				min: 0,
				max: 100,
				step: 5,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		await fireEvent.keyDown(slider, { key: 'ArrowRight' })

		expect(slider.getValue()).toBe(100)
		expect(onchange).not.toHaveBeenCalled()
	})

	it('exposes one focusable role="slider" thumb per value for multi-thumb sliders', () => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 20, 80 ],
				min: 0,
				max: 100,
				step: 5
			}
		})
		const root = container.querySelector('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		expect(root.getAttribute('role')).toBe('group')
		expect(thumbs).toHaveLength(2)
		for (const thumb of thumbs) {
			expect(thumb.getAttribute('role')).toBe('slider')
			expect(thumb.getAttribute('tabindex')).toBe('0')
		}
		expect(thumbs[0]?.getAttribute('aria-valuenow')).toBe('20')
		expect(thumbs[1]?.getAttribute('aria-valuenow')).toBe('80')
	})

	it('moves the focused thumb (not thumb 0) on keyboard input for multi-thumb sliders', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: [ 20, 80 ],
				min: 0,
				max: 100,
				step: 5,
				onchange
			}
		})
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowRight' })

		expect(thumbs[0]?.getAttribute('aria-valuenow')).toBe('20')
		expect(thumbs[1]?.getAttribute('aria-valuenow')).toBe('85')
		expect(onchange).toHaveBeenCalled()
	})

	it('renders ticks and labeled marks on the slider track', () => {
		const { container } = render(GooSlider, {
			props: {
				value: 50,
				min: 0,
				max: 100,
				ticks: 2,
				marks: [
					{ value: 25, label: 'Low' },
					{ value: 75, label: 'High' }
				]
			}
		})
		const marks = container.querySelectorAll<HTMLElement>('.goo-slider__mark')

		expect(marks).toHaveLength(5)
		expect(container.querySelector('.goo-slider__mark-label')?.textContent).toBe('Low')
		expect([ ...marks ].map(mark => mark.style.left)).toContain('75%')
	})

	it('snaps values to explicit snap points', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: 12,
				min: 0,
				max: 100,
				snap: [ 0, 10, 100 ]
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!

		await tick()

		expect(slider.getValue()).toBe(10)
	})

	it('uses explicit mode="variance" without the legacy variance boolean', () => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 30, 50, 70 ],
				mode: 'variance'
			}
		})

		expect(container.querySelector('.goo-slider')?.hasAttribute('variance')).toBe(true)
		expect(container.querySelectorAll('.goo-slider__thumb--variance-control')).toHaveLength(2)
	})

	it('maps log-scaled values to track percentage', () => {
		const { container } = render(GooSlider, {
			props: {
				value: 10,
				min: 1,
				max: 100,
				scale: 'log'
			}
		})
		const thumb = container.querySelector<HTMLElement>('.goo-slider__thumb')!

		expect(thumb.style.left).toBe('50%')
	})

	it('enforces minimum distance between range thumbs', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 20, 35 ],
				min: 0,
				max: 100,
				step: 5,
				minDistance: 15
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowLeft' })

		expect(slider.getValue()).toEqual([ 20, 35 ])
	})

	it('renders value bubbles when enabled', () => {
		const { container } = render(GooSlider, {
			props: {
				value: 42,
				valueBubble: true
			}
		})

		expect(container.querySelector('.goo-slider__value-bubble')?.textContent).toBe('42')
	})

	it('renders variance handles with side-control roles', () => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 30, 50, 70 ],
				min: 0,
				max: 100,
				variance: true
			}
		})
		const slider = container.querySelector<HTMLElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		expect(slider.classList.contains('goo-slider--variance')).toBe(true)
		expect(slider.hasAttribute('variance')).toBe(true)
		expect(thumbs[0]?.classList.contains('goo-slider__thumb--variance-control')).toBe(true)
		expect(thumbs[1]?.classList.contains('goo-slider__thumb--variance-base')).toBe(true)
		expect(thumbs[2]?.classList.contains('goo-slider__thumb--variance-control')).toBe(true)
		expect(thumbs[0]?.classList.contains('goo-slider__thumb--variance-low')).toBe(true)
		expect(thumbs[2]?.classList.contains('goo-slider__thumb--variance-high')).toBe(true)
		expect(thumbs[0]?.dataset.role).toBe('variance')
		expect(thumbs[1]?.dataset.role).toBe('base')
		expect(thumbs[2]?.dataset.role).toBe('variance')
		expect(thumbs[0]?.dataset.side).toBe('low')
		expect(thumbs[1]?.dataset.side).toBe('base')
		expect(thumbs[2]?.dataset.side).toBe('high')
		expect(thumbs[0]?.getAttribute('aria-label')).toBe('Value low')
		expect(thumbs[1]?.getAttribute('aria-label')).toBe('Value base')
		expect(thumbs[2]?.getAttribute('aria-label')).toBe('Value high')
	})

	it('styles variance coverage as a mirrored gradient in both directions', () => {
		expect(sliderCss).toContain('.goo-slider.goo-slider--variance .goo-slider__coverage')
		expect(sliderCss).toContain('linear-gradient(\n\t\tto right')
		expect(sliderCss).toContain('.goo-slider.goo-slider--variance.goo-slider--vertical .goo-slider__coverage')
		expect(sliderCss).toContain('linear-gradient(\n\t\tto top')
		expect(sliderCss).toContain('rotate(45deg)')
		expect(sliderCss).toContain('translateX(-50%) translateY(50%) rotate(45deg)')
		expect(sliderCss).not.toContain('clip-path: polygon')
	})

	it('moves variance side controls symmetrically when one side changes', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: [ 30, 50, 70 ],
				min: 0,
				max: 100,
				step: 5,
				variance: true,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[2]!, { key: 'ArrowRight' })

		expect(slider.getValue()).toEqual([ 25, 50, 75 ])
		expect(onchange.mock.calls[0]?.[0]).toEqual([ 25, 50, 75 ])
	})

	it('slides variance side controls with the base control', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 30, 50, 70 ],
				min: 0,
				max: 100,
				step: 5,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowRight' })

		expect(slider.getValue()).toEqual([ 35, 55, 75 ])
	})

	it('keeps variance side controls mirrored when dragged toward the base', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 40, 50, 60 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[0]!, { key: 'ArrowRight' })

		expect(slider.getValue()).toEqual([ 50, 50, 50 ])
	})

	it('keeps variance high control mirrored when dragged toward the base', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 40, 50, 60 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[2]!, { key: 'ArrowLeft' })

		expect(slider.getValue()).toEqual([ 50, 50, 50 ])
	})

	it('expands variance controls symmetrically up to range edges', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 10, 50, 90 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[2]!, { key: 'ArrowRight' })

		expect(slider.getValue()).toEqual([ 0, 50, 100 ])
	})

	it('does not emit when variance side movement is clamped at a range edge', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: [ 0, 10, 20 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[0]!, { key: 'ArrowLeft' })

		expect(slider.getValue()).toEqual([ 0, 10, 20 ])
		expect(onchange).not.toHaveBeenCalled()
	})

	it('lets the variance base reach the range edge while compressing only the edge side', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: [ 0, 10, 20 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowLeft' })

		expect(slider.getValue()).toEqual([ 0, 0, 10 ])
		expect(onchange.mock.calls[0]?.[0]).toEqual([ 0, 0, 10 ])
	})

	it('preserves variance radius on the free side as the base reaches the edge', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 30, 50, 70 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[1]!, { key: 'End' })

		expect(slider.getValue()).toEqual([ 80, 100, 100 ])
	})

	it('restores the compressed variance side when the base moves back from the edge', async() => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 80, 100, 100 ],
				min: 0,
				max: 100,
				step: 10,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')

		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowLeft' })
		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowLeft' })
		await fireEvent.keyDown(thumbs[1]!, { key: 'ArrowLeft' })

		expect(slider.getValue()).toEqual([ 50, 70, 90 ])
	})

	it('drags the clicked variance base even when it overlaps an edge control', () => {
		const { container } = render(GooSlider, {
			props: {
				value: [ 0, 0, 20 ],
				min: 0,
				max: 100,
				step: 1,
				variance: true
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const track = container.querySelector<HTMLElement>('.goo-slider__track')!
		const thumbs = container.querySelectorAll<HTMLElement>('.goo-slider__thumb')
		track.getBoundingClientRect = () => ({
			x: 0,
			y: 0,
			width: 100,
			height: 20,
			top: 0,
			right: 100,
			bottom: 20,
			left: 0,
			toJSON: () => ({})
		})
		slider.setPointerCapture = vi.fn()

		thumbs[1]!.dispatchEvent(pointerEvent('pointerdown', { pointerId: 3, clientX: 0 }))
		slider.dispatchEvent(pointerEvent('pointermove', { pointerId: 3, clientX: 10 }))

		expect(slider.getValue()).toEqual([ 0, 10, 30 ])
	})

	it('disables the hidden form value when the slider is disabled', () => {
		const { container } = render(GooSlider, {
			props: {
				name: 'opacity',
				value: 40,
				disabled: true
			}
		})

		expect(container.querySelector<HTMLInputElement>('input[data-goo-slider-input]')?.disabled).toBe(true)
	})

	it('ignores pointer release from a non-active pointer', () => {
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 20,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		slider.setPointerCapture = vi.fn()
		slider.releasePointerCapture = vi.fn()

		slider.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 20 }))
		slider.dispatchEvent(pointerEvent('pointerup', { pointerId: 2, clientX: 40 }))

		expect(slider.releasePointerCapture).not.toHaveBeenCalled()
		expect(onchange).not.toHaveBeenCalled()

		slider.dispatchEvent(pointerEvent('pointerup', { pointerId: 1, clientX: 40 }))

		expect(slider.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
		expect(onchange).toHaveBeenCalledOnce()
	})

	it('animates track clicks but keeps thumb-origin drags immediate', async() => {
		vi.useFakeTimers()
		const { container } = render(GooSlider, {
			props: {
				value: 20
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const thumb = container.querySelector<HTMLElement>('.goo-slider__thumb')!
		slider.setPointerCapture = vi.fn()
		slider.releasePointerCapture = vi.fn()

		slider.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 160 }))
		await tick()

		expect(slider.classList.contains('goo-slider--animate')).toBe(true)
		slider.dispatchEvent(pointerEvent('pointerup', { pointerId: 1, clientX: 160 }))
		vi.runAllTimers()
		await tick()
		expect(slider.classList.contains('goo-slider--animate')).toBe(false)

		thumb.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2, clientX: 30 }))
		await tick()

		expect(slider.classList.contains('goo-slider--animate')).toBe(false)
		thumb.dispatchEvent(pointerEvent('pointerup', { pointerId: 2, clientX: 30 }))
		vi.useRealTimers()
	})

	it('settles snapped drag jumps with a snap animation', async() => {
		vi.useFakeTimers()
		const { container } = render(GooSlider, {
			props: {
				value: 0,
				min: 0,
				max: 100,
				snap: [ 0, 50, 100 ]
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const track = container.querySelector<HTMLElement>('.goo-slider__track')!
		const thumb = container.querySelector<HTMLElement>('.goo-slider__thumb')!
		track.getBoundingClientRect = () => ({
			x: 0,
			y: 0,
			width: 100,
			height: 20,
			top: 0,
			right: 100,
			bottom: 20,
			left: 0,
			toJSON: () => ({})
		})
		slider.setPointerCapture = vi.fn()
		slider.releasePointerCapture = vi.fn()

		thumb.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4, clientX: 0 }))
		slider.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, clientX: 60 }))
		await tick()

		expect(slider.getValue()).toBe(50)
		expect(slider.classList.contains('goo-slider--snap-animate')).toBe(true)
		expect(slider.classList.contains('goo-slider--animate')).toBe(false)

		vi.runAllTimers()
		await tick()

		expect(slider.classList.contains('goo-slider--snap-animate')).toBe(false)
		slider.dispatchEvent(pointerEvent('pointerup', { pointerId: 4, clientX: 60 }))
		vi.useRealTimers()
	})

	it('cleans active pointer capture and timers when unmounted mid-drag', async() => {
		vi.useFakeTimers()
		const { container, unmount } = render(GooSlider, {
			props: {
				value: 0,
				min: 0,
				max: 100,
				snap: [ 0, 50, 100 ]
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		const track = container.querySelector<HTMLElement>('.goo-slider__track')!
		const thumb = container.querySelector<HTMLElement>('.goo-slider__thumb')!
		track.getBoundingClientRect = () => ({
			x: 0,
			y: 0,
			width: 100,
			height: 20,
			top: 0,
			right: 100,
			bottom: 20,
			left: 0,
			toJSON: () => ({})
		})
		slider.setPointerCapture = vi.fn()
		slider.releasePointerCapture = vi.fn()

		thumb.dispatchEvent(pointerEvent('pointerdown', { pointerId: 8, clientX: 0 }))
		slider.dispatchEvent(pointerEvent('pointermove', { pointerId: 8, clientX: 60 }))
		await tick()

		unmount()
		vi.runAllTimers()

		expect(slider.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(8)
		vi.useRealTimers()
	})

	it('ignores non-primary pointer drags', () => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 20,
				oninput,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		slider.setPointerCapture = vi.fn()

		slider.dispatchEvent(pointerEvent('pointerdown', { button: 2, buttons: 2, pointerId: 9, clientX: 20 }))
		slider.dispatchEvent(pointerEvent('pointermove', { button: 2, buttons: 2, pointerId: 9, clientX: 80 }))
		slider.dispatchEvent(pointerEvent('pointerup', { button: 2, buttons: 0, pointerId: 9, clientX: 80 }))

		expect(slider.getValue()).toBe(20)
		expect(slider.setPointerCapture).not.toHaveBeenCalled()
		expect(oninput).not.toHaveBeenCalled()
		expect(onchange).not.toHaveBeenCalled()
	})

	it('cleans up canceled pointer drags without committing a change', () => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooSlider, {
			props: {
				value: 20,
				oninput,
				onchange
			}
		})
		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		slider.setPointerCapture = vi.fn()
		slider.releasePointerCapture = vi.fn()

		slider.dispatchEvent(pointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 20 }))
		slider.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 80 }))
		slider.dispatchEvent(pointerEvent('pointercancel', { pointerId: 7, pointerType: 'touch', clientX: 80 }))
		slider.dispatchEvent(pointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 80 }))

		expect(slider.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7)
		expect(oninput).toHaveBeenCalled()
		expect(onchange).not.toHaveBeenCalled()
	})
})
