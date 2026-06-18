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
	nextValue: TValue
}

describe('Goo field factories', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('updates values without remounting and ignores calls after destroy', async() => {
		const cases: FieldFactoryCase<unknown>[] = [
			{
				create: () => createInputField({ value: 'alpha' }),
				nextValue: 'bravo'
			},
			{
				create: () => createNumberField({ value: 4 }),
				nextValue: 8
			},
			{
				create: () => createTextareaField({ value: 'draft' }),
				nextValue: 'done'
			},
			{
				create: () => createCheckboxField({ value: false }),
				nextValue: true
			},
			{
				create: () => createRadioGroupField({
					options: [
						{ label: 'One', value: 'one' },
						{ label: 'Two', value: 'two' }
					],
					value: 'one'
				}),
				nextValue: 'two'
			},
			{
				create: () => createButtonGroupField({
					options: [
						{ key: 'left', value: 'Left' },
						{ key: 'right', value: 'Right' }
					],
					value: 'left'
				}),
				nextValue: 'right'
			},
			{
				create: () => createColorField({ value: '#000000' }),
				nextValue: '#00ff00'
			},
			{
				create: () => createAngleInputField({ value: 0 }),
				nextValue: 90
			},
			{
				create: () => createSelectField({
					options: { a: 'A', b: 'B' },
					value: 'a'
				}),
				nextValue: 'b'
			}
		]

		for (const entry of cases) {
			const field = entry.create()
			document.body.appendChild(field)
			await tick()
			const child = field.firstElementChild

			field.setValue(entry.nextValue)
			await tick()

			expect(field.firstElementChild).toBe(child)
			expect(field.getValue()).toEqual(entry.nextValue)

			field.destroy()
			field.destroy()
			field.setValue('__after_destroy__')

			expect(field.firstElementChild).toBeNull()
			expect(field.isConnected).toBe(false)
		}
	})
})
