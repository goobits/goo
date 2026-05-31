import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it } from 'vitest'

import type { GooSelectElement } from '../select/types.ts'
import BindableFormControlsHost from './BindableFormControlsHost.svelte'

describe('Goo bindable form controls', () => {
	it('updates bound values from form control interaction and imperative APIs', async() => {
		const { container } = render(BindableFormControlsHost)

		const input = container.querySelector<HTMLInputElement>('.goo-input__content')!
		await fireEvent.input(input, { target: { value: 'bravo' } })
		await tick()
		expect(screen.getByTestId('input-value').textContent).toBe('bravo')

		const number = container.querySelector<HTMLInputElement>('.goo-number__content')!
		await fireEvent.input(number, { target: { value: '8' } })
		await tick()
		expect(screen.getByTestId('number-value').textContent).toBe('8')

		const textarea = container.querySelector<HTMLTextAreaElement>('.goo-textarea__input')!
		await fireEvent.input(textarea, { target: { value: 'sent' } })
		await tick()
		expect(screen.getByTestId('textarea-value').textContent).toBe('sent')

		const select = container.querySelector<GooSelectElement>('.goo-select')!
		select.setValue('b')
		await tick()
		expect(screen.getByTestId('select-value').textContent).toBe('b')

		const checkbox = container.querySelector<HTMLDivElement>('.goo-checkbox')!
		await fireEvent.click(checkbox)
		await tick()
		expect(screen.getByTestId('checkbox-checked').textContent).toBe('true')
		expect(screen.getByTestId('checkbox-value').textContent).toBe('true')
	})

	it('includes GooSelect values in native FormData when named', async() => {
		const { container } = render(BindableFormControlsHost)
		const select = container.querySelector<GooSelectElement>('.goo-select')!
		select.setValue('b')
		await tick()

		const form = screen.getByTestId('form') as HTMLFormElement
		const formData = new FormData(form)

		expect(formData.get('select-field')).toBe('b')
	})
})
