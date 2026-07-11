/**
 * Goo-docs metadata for the `GooNumber` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooNumber } from '../../src/input/index.ts'

export default {
	id: 'goo-number',
	component: GooNumber,
	examples: [
		{
			title: 'Size (pt)',
			props: { title: 'Size', value: 1000, min: 0, max: 10000, step: 10, unit: 'pt' }
		},
		{
			title: 'Opacity (%)',
			props: { title: 'Opacity', value: 0.5, min: 0, max: 1, step: 0.01, unit: '%' }
		},
		{
			title: 'Basic (0-100)',
			props: { title: 'Basic', value: 50, min: 0, max: 100 }
		},
		{
			title: 'Disabled',
			props: { value: 25, disabled: true }
		},
		{
			title: 'Programmatic control',
			description: 'setValue() respects min/max clamps; the buttons mirror the live value.',
			span: 'wide',
			props: { title: 'Dynamic', value: 50, min: 0, max: 100, step: 10, 'data-demo-target': 'prog-number' },
			actions: [
				{ label: '0', method: 'setValue', args: [ 0 ], action: '0', grouped: true, selectedWhen: { prop: 'value', equals: 0 } },
				{ label: '50', method: 'setValue', args: [ 50 ], action: '50', grouped: true, selectedWhen: { prop: 'value', equals: 50 } },
				{ label: '100', method: 'setValue', args: [ 100 ], action: '100', grouped: true, selectedWhen: { prop: 'value', equals: 100 } },
				{ label: 'Random', method: 'setValue', random: [ 0, 100 ], action: 'random' }
			]
		}
	]
}
