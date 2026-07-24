import { fireEvent } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSliderField } from '../GooSliderField.ts'

describe('GooSliderField', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-slider-field').forEach(element => element.remove())
	})

	it('renders a slider with a numeric input and updates the value', async() => {
		const onchange = vi.fn()
		const field = createSliderField({
			max: 100,
			min: 0,
			onchange,
			step: 1,
			value: 12
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.querySelector('.goo-slider')).not.toBeNull()
		expect(field.querySelector('.goo-number')).not.toBeNull()
		expect(field.classList.contains('goo-slider-field--goo')).toBe(true)
		expect(field.querySelector('.goo-slider-field__header')).not.toBeNull()
		expect(field.querySelector('.goo-slider-field__header + .goo-slider-field__slider')).not.toBeNull()
		expect(field.querySelector('.goo-slider__track')).not.toBeNull()

		field.setValue(24, { silent: false })

		expect(field.getValue()).toBe(24)
		expect(onchange).toHaveBeenCalledWith(24, expect.objectContaining({
			state: 'change',
			value: 24,
			values: [ 24 ]
		}))
	})

	it('preserves decimal number edits at the configured step', async() => {
		const oninput = vi.fn()
		const field = createSliderField({
			max: 8,
			min: 0,
			oninput,
			step: 0.1,
			unit: 'px',
			value: 0
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const input = field.querySelector<HTMLInputElement>('.goo-number__content')!
		await fireEvent.input(input, { target: { value: '2.5' } })
		await fireEvent.keyDown(input, { key: 'Enter' })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.getValue()).toBe(2.5)
		expect(field.getSlider().values).toEqual([ 2.5 ])
		expect(input.value).toBe('2.5')
		expect(oninput).toHaveBeenCalledWith(2.5, expect.objectContaining({
			state: 'input',
			value: 2.5,
			values: [ 2.5 ]
		}))
	})

	it('forwards power scale options to the field slider', async() => {
		const field = createSliderField({
			max: 1,
			min: 0.4,
			scale: 'power',
			scalePower: 6,
			step: 0.001,
			value: 0.935
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const slider = field.querySelector<HTMLElement>('.goo-slider')!
		const thumb = field.querySelector<HTMLElement>('.goo-slider__thumb')!
		expect(slider.getAttribute('scale')).toBe('power')
		expect(slider.getAttribute('scale-power')).toBe('6')
		expect(Number.parseFloat(thumb.style.left)).toBeCloseTo(50, 0)
	})

	it('preserves min/max object values for dual ranges', async() => {
		const field = createSliderField({
			max: 64,
			min: 4,
			step: 1,
			value: { min: 10, max: 30 }
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.querySelectorAll('.goo-number')).toHaveLength(2)

		field.setValue({ min: 12, max: 32 })

		expect(field.getValue()).toEqual({ min: 12, max: 32 })
		expect(field.getSlider().values).toEqual([ 12, 32 ])
	})

	it('preserves x/y object values for paired axes', async() => {
		const field = createSliderField({
			canCross: true,
			max: 50,
			min: -50,
			step: 1,
			unit: 'px',
			value: { x: -4, y: 12 }
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.querySelectorAll('.goo-number')).toHaveLength(2)
		expect(field.getSlider().values).toEqual([ -4, 12 ])

		field.setValue({ x: 8, y: -10 })

		expect(field.getValue()).toEqual({ x: 8, y: -10 })
		expect(field.getSlider().values).toEqual([ 8, -10 ])
	})

	it('forwards variance mode to three-thumb field sliders', async() => {
		const field = createSliderField({
			max: 100,
			min: 0,
			step: 1,
			value: [ 30, 50, 70 ],
			variance: true
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.querySelectorAll('.goo-number')).toHaveLength(3)
		expect(field.querySelector('.goo-slider')?.hasAttribute('variance')).toBe(true)
		expect(field.querySelectorAll('.goo-slider__thumb--variance-control')).toHaveLength(2)
		expect(field.querySelector('.goo-slider__thumb--variance-base')).not.toBeNull()
		expect(field.getValue()).toEqual([ 30, 50, 70 ])
		expect(field.getSlider().values).toEqual([ 30, 50, 70 ])
	})

	it('mirrors variance number edits through the opposite side control', async() => {
		const oninput = vi.fn()
		const field = createSliderField({
			max: 100,
			min: 0,
			oninput,
			step: 1,
			value: [ 30, 50, 70 ],
			variance: true
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const inputs = field.querySelectorAll<HTMLInputElement>('.goo-number__content')
		await fireEvent.input(inputs[2]!, { target: { value: '60' } })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.getValue()).toEqual([ 40, 50, 60 ])
		expect(field.getSlider().values).toEqual([ 40, 50, 60 ])
		expect([ ...field.querySelectorAll<HTMLInputElement>('.goo-number__content') ].map(input => input.value)).toEqual([ '40', '50', '60' ])
		expect(oninput.mock.calls[0]?.[0]).toEqual([ 40, 50, 60 ])
	})

	it('syncs all number fields after variance slider edits', async() => {
		const field = createSliderField({
			max: 100,
			min: 0,
			step: 5,
			value: [ 30, 50, 70 ],
			variance: true
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const thumbs = field.querySelectorAll<HTMLElement>('.goo-slider__thumb')
		await fireEvent.keyDown(thumbs[2]!, { key: 'ArrowRight' })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.getSlider().values).toEqual([ 25, 50, 75 ])
		expect([ ...field.querySelectorAll<HTMLInputElement>('.goo-number__content') ].map(input => input.value)).toEqual([ '25', '50', '75' ])
	})

	it('uses shared edge-compressed variance math for number edits', async() => {
		const field = createSliderField({
			max: 100,
			min: 0,
			step: 10,
			value: [ 0, 10, 20 ],
			variance: true
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const inputs = field.querySelectorAll<HTMLInputElement>('.goo-number__content')
		await fireEvent.input(inputs[1]!, { target: { value: '0' } })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.getValue()).toEqual([ 0, 0, 10 ])
		expect(field.getSlider().values).toEqual([ 0, 0, 10 ])
	})

	it('passes slider primitive options through', async() => {
		const field = createSliderField({
			max: 100,
			min: 0,
			mode: 'variance',
			ticks: 2,
			value: [ 25, 50, 75 ],
			valueBubble: true
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(field.querySelector('.goo-slider')?.getAttribute('mode')).toBe('variance')
		expect(field.querySelectorAll('.goo-slider__mark')).toHaveLength(3)
		expect(field.querySelector('.goo-slider__value-bubble')).not.toBeNull()
	})

	it('destroys idempotently without resurrecting controls or emitting callbacks', async() => {
		const onchange = vi.fn()
		const field = createSliderField({
			max: 100,
			min: 0,
			onchange,
			value: 25
		})
		document.body.appendChild(field)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		field.destroy()
		field.destroy()
		field.setValue(50, { silent: false })
		field.setOptions({ value: 75 })

		expect(document.body.contains(field)).toBe(false)
		expect(field.querySelector('.goo-slider')).toBeNull()
		expect(field.querySelector('.goo-number')).toBeNull()
		expect(field.getValue()).toBe(25)
		expect(onchange).not.toHaveBeenCalled()
	})
})
