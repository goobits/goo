/**
 * Goo-docs metadata for the `GooRadio` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooRadio } from '../../src/radio/index.ts'

export default {
	id: 'goo-radio',
	component: GooRadio,
	valueKey: 'checked',
	examples: [
		{
			title: 'Manual group',
			description: 'Standalone radios that share a name coordinate as one group.',
			mounts: [
				{ title: 'Option A', name: 'manual-group', value: 'a', label: 'Option A' },
				{ title: 'Option B', name: 'manual-group', value: 'b', label: 'Option B' },
				{ title: 'Option C', name: 'manual-group', value: 'c', label: 'Option C', checked: true }
			]
		},
		{
			title: 'Disabled',
			mounts: [
				{ name: 'disabled-group', value: 'x', label: 'Disabled unchecked', disabled: true },
				{ name: 'disabled-group', value: 'y', label: 'Disabled checked', checked: true, disabled: true }
			]
		},
		{
			title: 'Programmatic control',
			description: 'check() selects a radio and releases its same-name siblings. Native radios cannot be unchecked by re-clicking, so deselect with uncheck() or a Clear affordance.',
			span: 'wide',
			actionsLayout: 'vertical',
			mounts: [
				{ title: 'Prog A', name: 'prog-manual', value: 'a', label: 'Option A', 'data-demo-target': 'prog-radio-a' },
				{ title: 'Prog B', name: 'prog-manual', value: 'b', label: 'Option B', 'data-demo-target': 'prog-radio-b' },
				{ title: 'Prog C', name: 'prog-manual', value: 'c', label: 'Option C', 'data-demo-target': 'prog-radio-c' }
			],
			actions: [
				{ label: 'Select A', method: 'check', target: 0, action: 'select-a', grouped: true, selectedWhen: { prop: 'checked', equals: true } },
				{ label: 'Select B', method: 'check', target: 1, action: 'select-b', grouped: true, selectedWhen: { prop: 'checked', equals: true } },
				{ label: 'Select C', method: 'check', target: 2, action: 'select-c', grouped: true, selectedWhen: { prop: 'checked', equals: true } },
				{ label: 'Clear', method: 'uncheck', target: 'all', action: 'clear-checked', grouped: true }
			]
		}
	]
}
