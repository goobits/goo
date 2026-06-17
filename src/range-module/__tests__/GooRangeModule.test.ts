import { fireEvent } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRangeModuleField } from '../GooRangeModule.ts'

describe('GooRangeModule', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-range-module').forEach(element => element.remove())
	})

	it('renders a slider with a numeric input and updates the value', async() => {
		const onchange = vi.fn()
		const range = createRangeModuleField({
			max: 100,
			min: 0,
			onchange,
			step: 1,
			value: 12
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.querySelector('.goo-slider')).not.toBeNull()
		expect(range.querySelector('.goo-number')).not.toBeNull()
		expect(range.classList.contains('goo-range-module--goo')).toBe(true)
		expect(range.querySelector('.goo-range-module__header')).not.toBeNull()
		expect(range.querySelector('.goo-range-module__header + .goo-range-module__slider')).not.toBeNull()
		expect(range.querySelector('.goo-slider__track')).not.toBeNull()

		range.setValue(24, { silent: false })

		expect(range.getValue()).toBe(24)
		expect(onchange).toHaveBeenCalledWith(24, expect.objectContaining({
			state: 'change',
			value: 24,
			values: [ 24 ]
		}))
	})

	it('preserves min/max object values for dual ranges', async() => {
		const range = createRangeModuleField({
			max: 64,
			min: 4,
			step: 1,
			value: { min: 10, max: 30 }
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.querySelectorAll('.goo-number')).toHaveLength(2)

		range.setValue({ min: 12, max: 32 })

		expect(range.getValue()).toEqual({ min: 12, max: 32 })
		expect(range.getRange().values).toEqual([ 12, 32 ])
	})

	it('preserves x/y object values for paired axes', async() => {
		const range = createRangeModuleField({
			canCross: true,
			max: 50,
			min: -50,
			step: 1,
			unit: 'px',
			value: { x: -4, y: 12 }
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.querySelectorAll('.goo-number')).toHaveLength(2)
		expect(range.getRange().values).toEqual([ -4, 12 ])

		range.setValue({ x: 8, y: -10 })

		expect(range.getValue()).toEqual({ x: 8, y: -10 })
		expect(range.getRange().values).toEqual([ 8, -10 ])
	})

	it('forwards variance mode to three-thumb range sliders', async() => {
		const range = createRangeModuleField({
			max: 100,
			min: 0,
			step: 1,
			value: [ 30, 50, 70 ],
			variance: true
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.querySelectorAll('.goo-number')).toHaveLength(3)
		expect(range.querySelector('.goo-slider')?.hasAttribute('variance')).toBe(true)
		expect(range.querySelectorAll('.goo-slider__thumb--variance-control')).toHaveLength(2)
		expect(range.querySelector('.goo-slider__thumb--variance-base')).not.toBeNull()
		expect(range.getValue()).toEqual([ 30, 50, 70 ])
		expect(range.getRange().values).toEqual([ 30, 50, 70 ])
	})

	it('mirrors variance number edits through the opposite side control', async() => {
		const oninput = vi.fn()
		const range = createRangeModuleField({
			max: 100,
			min: 0,
			oninput,
			step: 1,
			value: [ 30, 50, 70 ],
			variance: true
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const inputs = range.querySelectorAll<HTMLInputElement>('.goo-number__content')
		await fireEvent.input(inputs[2]!, { target: { value: '60' } })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.getValue()).toEqual([ 40, 50, 60 ])
		expect(range.getRange().values).toEqual([ 40, 50, 60 ])
		expect([ ...range.querySelectorAll<HTMLInputElement>('.goo-number__content') ].map(input => input.value)).toEqual([ '40', '50', '60' ])
		expect(oninput.mock.calls[0]?.[0]).toEqual([ 40, 50, 60 ])
	})

	it('syncs all number fields after variance slider edits', async() => {
		const range = createRangeModuleField({
			max: 100,
			min: 0,
			step: 5,
			value: [ 30, 50, 70 ],
			variance: true
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const thumbs = range.querySelectorAll<HTMLElement>('.goo-slider__thumb')
		await fireEvent.keyDown(thumbs[2]!, { key: 'ArrowRight' })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.getRange().values).toEqual([ 25, 50, 75 ])
		expect([ ...range.querySelectorAll<HTMLInputElement>('.goo-number__content') ].map(input => input.value)).toEqual([ '25', '50', '75' ])
	})

	it('uses shared edge-compressed variance math for number edits', async() => {
		const range = createRangeModuleField({
			max: 100,
			min: 0,
			step: 10,
			value: [ 0, 10, 20 ],
			variance: true
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		const inputs = range.querySelectorAll<HTMLInputElement>('.goo-number__content')
		await fireEvent.input(inputs[1]!, { target: { value: '0' } })
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.getValue()).toEqual([ 0, 0, 10 ])
		expect(range.getRange().values).toEqual([ 0, 0, 10 ])
	})

	it('passes slider primitive options through', async() => {
		const range = createRangeModuleField({
			max: 100,
			min: 0,
			mode: 'variance',
			ticks: 2,
			value: [ 25, 50, 75 ],
			valueBubble: true
		})
		document.body.appendChild(range)
		await new Promise(resolve => setTimeout(resolve, 0)) // test-shape: timing-probe - documented test timing behavior.

		expect(range.querySelector('.goo-slider')?.getAttribute('mode')).toBe('variance')
		expect(range.querySelectorAll('.goo-slider__mark')).toHaveLength(3)
		expect(range.querySelector('.goo-slider__value-bubble')).not.toBeNull()
	})
})
