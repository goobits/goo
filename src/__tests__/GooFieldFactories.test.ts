import { tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createAngleInputField } from '../angle-input/index.ts'
import { createButtonField } from '../button/index.ts'
import { createButtonGroupField } from '../button-group/index.ts'
import { createCheckboxField } from '../checkbox/index.ts'
import { createColorField } from '../color/_createColorField.ts'
import { createInputField, createNumberField } from '../input/index.ts'
import { createFieldGroup, createLabeledField } from '../label/index.ts'
import { createRadioGroupField } from '../radio/_createRadioGroupField.ts'
import { createSelectField } from '../select/index.ts'
import { createTextareaField } from '../textarea/_createTextareaField.ts'

type FieldFactoryCase<TValue> = {
	create(): HTMLElement & {
		destroy(): void
		getValue(): TValue
		setValue(value: TValue): void
	}
	mountedValue: TValue
	preReadyValue: TValue
}

describe('Goo field factories', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('updates values without remounting and ignores calls after destroy', async() => {
		const cases: FieldFactoryCase<unknown>[] = [
			{
				create: () => createInputField({ value: 'alpha' }),
				mountedValue: 'charlie',
				preReadyValue: 'bravo'
			},
			{
				create: () => createNumberField({ value: 4 }),
				mountedValue: 12,
				preReadyValue: 8
			},
			{
				create: () => createTextareaField({ value: 'draft' }),
				mountedValue: 'sent',
				preReadyValue: 'done'
			},
			{
				create: () => createCheckboxField({ value: false }),
				mountedValue: false,
				preReadyValue: true
			},
			{
				create: () => createRadioGroupField({
					options: [
						{ label: 'One', value: 'one' },
						{ label: 'Two', value: 'two' }
					],
					value: 'one'
				}),
				mountedValue: 'one',
				preReadyValue: 'two'
			},
			{
				create: () => createButtonGroupField({
					options: [
						{ key: 'left', value: 'Left' },
						{ key: 'right', value: 'Right' }
					],
					value: 'left'
				}),
				mountedValue: 'left',
				preReadyValue: 'right'
			},
			{
				create: () => createColorField({ value: '#000000' }),
				mountedValue: '#0000ff',
				preReadyValue: '#00ff00'
			},
			{
				create: () => createAngleInputField({ value: 0 }),
				mountedValue: 180,
				preReadyValue: 90
			},
			{
				create: () => createSelectField({
					options: { a: 'A', b: 'B' },
					value: 'a'
				}),
				mountedValue: 'a',
				preReadyValue: 'b'
			}
		]

		for (const entry of cases) {
			const field = entry.create()
			document.body.appendChild(field)
			field.setValue(entry.preReadyValue)
			await tick()
			const child = field.firstElementChild
			expect(field.getValue()).toEqual(entry.preReadyValue)

			field.setValue(entry.mountedValue)
			await tick()

			expect(field.firstElementChild).toBe(child)
			expect(field.getValue()).toEqual(entry.mountedValue)

			field.destroy()
			field.destroy()
			field.setValue('__after_destroy__')

			expect(field.firstElementChild).toBeNull()
			expect(field.isConnected).toBe(false)
		}
	})

	it('creates framework-free field compositions around imperative controls', () => {
		const checkbox = createCheckboxField({ value: true })
		const field = createLabeledField({
			control: checkbox,
			label: 'Paint into layer',
			type: 'checkbox'
		})
		const group = createFieldGroup()
		group.appendChild(field)
		document.body.appendChild(group)

		expect(field.querySelector('.goo-field__label')?.textContent).toBe('Paint into layer')
		expect(field.control).toBe(checkbox)
		expect(field.dataset.gooFieldType).toBe('checkbox')

		group.destroy()
		expect(group.isConnected).toBe(false)
	})

	it('creates an imperative Goo button with DOM icons', () => {
		let clicks = 0
		const icon = document.createElement('svg')
		const field = createButtonField({
			icon,
			value: 'Upload',
			onclick: () => clicks++
		})
		document.body.appendChild(field)

		expect(field.button?.textContent).toContain('Upload')
		expect(field.button?.querySelector('svg')).toBe(icon)
		field.click()
		expect(clicks).toBe(1)

		field.destroy()
		expect(field.isConnected).toBe(false)
	})
})
