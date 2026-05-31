import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooSlider from '../GooSlider.svelte'
import { GooSlider as ExportedGooSlider } from '../index.js'
import type { GooSliderElement } from '../types.js'

describe('GooSlider', () => {
	it('exports the native Svelte component from the package subpath', () => {
		expect(ExportedGooSlider).toBe(GooSlider)
	})

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
})
