/**
 * Goo-docs metadata for the `GooColor` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooColor } from '../../src/color/index.ts'

export default {
	id: 'goo-color',
	component: GooColor,
	examples: [
		{
			title: 'Indigo',
			props: { value: '#6366f1' }
		},
		{
			title: 'Red',
			props: { value: '#ef4444' }
		},
		{
			title: 'Green',
			props: { value: '#22c55e' }
		},
		{
			title: 'With alpha',
			props: { value: '#6366f1', alpha: true }
		},
		{
			title: 'Disabled',
			props: { value: '#3b82f6', disabled: true }
		}
	]
}
