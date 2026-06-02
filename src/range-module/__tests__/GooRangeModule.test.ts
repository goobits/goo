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
		await new Promise(resolve => setTimeout(resolve, 0))

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
		await new Promise(resolve => setTimeout(resolve, 0))

		expect(range.querySelectorAll('.goo-number')).toHaveLength(2)

		range.setValue({ min: 12, max: 32 })

		expect(range.getValue()).toEqual({ min: 12, max: 32 })
		expect(range.range.values).toEqual([ 12, 32 ])
	})
})
