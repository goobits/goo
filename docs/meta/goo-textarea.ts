/**
 * Goo-docs metadata for the `GooTextarea` Svelte component.
 *
 * This build-time data is exported through the package-owned docs metadata index.
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
