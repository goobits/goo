/**
 * Goo-docs metadata for the `GooInput` Svelte component.
 *
 * This build-time data is exported through the package-owned docs metadata index.
 */

import { GooInput } from '../../src/input/index.ts'

export default {
	id: 'goo-input',
	component: GooInput,
	examples: [
		{
			title: 'With value',
			props: { title: 'Text', value: 'Hello, World!', placeholder: 'Enter text...' }
		},
		{
			title: 'Placeholder',
			props: { title: 'Placeholder', placeholder: 'Type something...' }
		},
		{
			title: 'Disabled',
			props: { value: 'This is disabled', disabled: true }
		},
		{
			title: 'Multiline',
			span: 'wide',
			props: { title: 'Textarea', multiline: true, value: 'Hello, World!\nThis textarea supports multiple lines.' }
		},
		{
			title: 'Programmatic control',
			description: 'Drive the input through its element API: setValue(), and focus().',
			span: 'wide',
			props: { title: 'Dynamic', value: 'Edit me', 'data-demo-target': 'prog-input' },
			actions: [
				{ label: 'Set Value', method: 'setValue', args: [ 'Programmatically set!' ], action: 'set-value' },
				{ label: 'Clear', method: 'setValue', args: [ '' ], action: 'clear' },
				{ label: 'Focus', method: 'focus', action: 'focus' }
			]
		}
	]
}
