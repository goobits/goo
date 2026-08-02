/**
 * Goo-docs metadata for the `GooRadioGroup` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooRadioGroup } from '../../src/radio/index.ts'

export default {
	id: 'goo-radio-group',
	component: GooRadioGroup,
	examples: [
		{
			title: 'Alignment',
			props: {
				name: 'alignment',
				value: 'center',
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'center', label: 'Center' },
					{ id: 'right', label: 'Right' }
				]
			}
		},
		{
			title: 'Quality',
			props: {
				name: 'quality',
				value: 'medium',
				options: [
					{ id: 'low', label: 'Low (Fast)' },
					{ id: 'medium', label: 'Medium' },
					{ id: 'high', label: 'High (Slow)' }
				]
			}
		},
		{
			title: 'Disabled',
			props: {
				name: 'disabled-demo',
				value: 'two',
				disabled: true,
				options: [
					{ id: 'one', label: 'One' },
					{ id: 'two', label: 'Two' },
					{ id: 'three', label: 'Three' }
				]
			}
		},
		{
			title: 'Programmatic control',
			description: 'setValue() selects by option id and emits change; getValue() reads the current selection.',
			span: 'wide',
			actionsLayout: 'vertical',
			props: {
				title: 'Fruits',
				name: 'fruits',
				value: 'apple',
				'data-demo-target': 'prog-radio',
				options: [
					{ id: 'apple', label: 'Apple' },
					{ id: 'banana', label: 'Banana' },
					{ id: 'cherry', label: 'Cherry' }
				]
			},
			actions: [
				{ label: 'Select Banana', method: 'setValue', args: [ 'banana' ], action: 'select-banana', grouped: true, selectedWhen: { prop: 'value', equals: 'banana' } },
				{ label: 'Select Cherry', method: 'setValue', args: [ 'cherry' ], action: 'select-cherry', grouped: true, selectedWhen: { prop: 'value', equals: 'cherry' } },
				{ label: 'Get Value', method: 'getValue', read: true, action: 'get-value' }
			]
		}
	]
}
