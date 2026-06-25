import { tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createAngleInputField } from '../angle-input/_createAngleInputField.ts'
import { createButtonGroupField } from '../button-group/_createButtonGroupField.ts'
import { createCheckboxField } from '../checkbox/_createCheckboxField.ts'
import { createColorField } from '../color/_createColorField.ts'
import { createInputField, createNumberField } from '../input/_createInputField.ts'
import { createRadioGroupField } from '../radio/_createRadioGroupField.ts'
import { createSelectField } from '../select/_createSelectField.ts'
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
})
