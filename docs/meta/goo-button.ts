/**
 * Goo-docs metadata for the `GooButton` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooButton } from '../../src/button/index.ts'
import { renderIconPlaceholderHtml } from '../../src/icon/index.ts'

const icon = (value: string, size = 16) => renderIconPlaceholderHtml({ value, size })

export default {
	id: 'goo-button',
	component: GooButton,
	// change events carry the toggle pressed state, not the label.
	valueKey: 'pressed',
	examples: [
		{
			title: 'Default',
			props: { value: 'Default' }
		},
		{
			title: 'With icon',
			content: `${ icon('save') } Save`
		},
		{
			title: 'Square',
			props: { square: true, ariaLabel: 'Settings' },
			content: icon('settings')
		},
		{
			title: 'Primary',
			props: { variant: 'primary', value: 'Primary' }
		},
		{
			title: 'Attention',
			props: { variant: 'attention', value: 'Warning' }
		},
		{
			title: 'Danger',
			props: { variant: 'danger', value: 'Danger' }
		},
		{
			title: 'Ghost',
			props: { variant: 'ghost', value: 'Ghost' }
		},
		{
			title: 'Link',
			props: { variant: 'link', value: 'Link Style' }
		},
		{
			title: 'Selected',
			props: { variant: 'selected', value: 'Selected' }
		},
		{
			title: 'Toggle',
			props: { toggle: true, value: 'Toggle me' }
		},
		{
			title: 'Disabled',
			props: { disabled: true, value: 'Disabled' }
		},
		{
			title: 'Disabled primary',
			props: { variant: 'primary', disabled: true, value: 'Primary' }
		}
	]
}
