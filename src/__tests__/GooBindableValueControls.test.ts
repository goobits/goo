import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it } from 'vitest'

import type { GooAngleInputElement } from '../angle-input/types.ts'
import type { GooColorElement } from '../color/types.ts'
import type { GooSliderElement } from '../slider/types.ts'
import BindableValueControlsHost from './BindableValueControlsHost.svelte'

describe('Goo bindable value controls', () => {
	it('updates bound values from selections and imperative value APIs', async() => {
		const { container } = render(BindableValueControlsHost)

		const angle = container.querySelector<GooAngleInputElement>('.goo-angle-input')!
		angle.setValue(90)
		await tick()
		expect(screen.getByTestId('angle-value').textContent).toBe('90')

		const buttons = container.querySelectorAll<HTMLButtonElement>('.goo-button-group .goo-button')
		await fireEvent.click(buttons[1]!)
		await tick()
		expect(screen.getByTestId('button-group-value').textContent).toBe('right')

		const color = container.querySelector<GooColorElement>('.goo-color')!
		color.setValue('#00ff00')
		await tick()
		expect(screen.getByTestId('color-value').textContent).toBe('#00ff00')

		const radio = container.querySelector<HTMLButtonElement>('.goo-radio[data-value="solo"]')!
		await fireEvent.click(radio)
		await tick()
		expect(screen.getByTestId('radio-checked').textContent).toBe('true')

		const groupRadio = container.querySelector<HTMLButtonElement>('.goo-radio[data-value="two"]')!
		await fireEvent.click(groupRadio)
		await tick()
		expect(screen.getByTestId('radio-group-value').textContent).toBe('two')

		const slider = container.querySelector<GooSliderElement>('.goo-slider')!
		slider.setValue(40)
		await tick()
		expect(screen.getByTestId('slider-value').textContent).toBe('40')
	})
})
