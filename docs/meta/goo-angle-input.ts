/**
 * Goo-docs metadata for the `GooAngleInput` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooAngleInput } from '../../src/angle-input/index.ts'

export default {
	id: 'goo-angle-input',
	component: GooAngleInput,
	examples: [
		{
			title: '180 degrees',
			props: { title: 'Angle', value: 180 }
		},
		{
			title: 'Pi radians',
			props: { title: 'Radians', value: 3.14159, unit: 'radian' }
		},
		{
			title: 'Disabled',
			props: { value: 90, disabled: true }
		},
		{
			title: 'Programmatic control',
			description: 'setValue() drives the dial and number together; the buttons mirror the live angle.',
			span: 'wide',
			props: { title: 'Dynamic', value: 45, 'data-demo-target': 'prog-angle' },
			actions: [
				{ label: '0°', method: 'setValue', args: [ 0 ], action: '0', grouped: true, selectedWhen: { prop: 'value', equals: 0 } },
				{ label: '90°', method: 'setValue', args: [ 90 ], action: '90', grouped: true, selectedWhen: { prop: 'value', equals: 90 } },
				{ label: '180°', method: 'setValue', args: [ 180 ], action: '180', grouped: true, selectedWhen: { prop: 'value', equals: 180 } },
				{ label: '270°', method: 'setValue', args: [ 270 ], action: '270', grouped: true, selectedWhen: { prop: 'value', equals: 270 } }
			]
		}
	]
}
