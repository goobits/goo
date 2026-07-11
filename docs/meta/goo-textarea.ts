/**
 * Goo-docs metadata for the `GooTextarea` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooTextarea } from '../../src/textarea/index.ts'

export default {
	id: 'goo-textarea',
	component: GooTextarea,
	examples: [
		{
			title: 'Empty',
			props: { placeholder: 'Enter your message...', rows: 3 }
		},
		{
			title: 'With value',
			props: { rows: 4, value: 'Hello, World!\nThis is a multi-line textarea.\nIt supports multiple lines.' }
		},
		{
			title: 'Disabled',
			props: { disabled: true, rows: 2, value: 'This textarea is disabled' }
		}
	]
}
