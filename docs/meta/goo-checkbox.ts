/**
 * Goo-docs metadata for the `GooCheckbox` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooCheckbox } from '../../src/checkbox/index.ts'

export default {
	id: 'goo-checkbox',
	component: GooCheckbox,
	valueKey: 'checked',
	examples: [
		{
			title: 'Unchecked',
			props: { title: 'Basic' }
		},
		{
			title: 'Checked',
			props: { title: 'Checked', checked: true }
		},
		{
			title: 'Disabled off',
			props: { title: 'Disabled off', disabled: true }
		},
		{
			title: 'Disabled on',
			props: { title: 'Disabled on', checked: true, disabled: true }
		},
		{
			title: 'With label (off)',
			props: { label: 'Enable feature' }
		},
		{
			title: 'With label (on)',
			props: { label: 'Accept terms and conditions', checked: true }
		},
		{
			title: 'Programmatic control',
			description: 'Drive the checkbox through its element API: toggle() and setValue(). The buttons mirror its live state.',
			span: 'wide',
			props: { 'data-demo-target': 'prog-checkbox' },
			actions: [
				{ label: 'Toggle', method: 'toggle', action: 'toggle' },
				{ label: 'True', method: 'setValue', args: [ true ], action: 'set-true', grouped: true, selectedWhen: { prop: 'checked', equals: true } },
				{ label: 'False', method: 'setValue', args: [ false ], action: 'set-false', grouped: true, selectedWhen: { prop: 'checked', equals: false } }
			]
		}
	]
}
