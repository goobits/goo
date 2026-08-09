/**
 * Goo-docs metadata for the `GooButton` Svelte component.
 *
 * This build-time data is exported through the package-owned docs metadata index.
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
			props: { label: 'Default' }
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
			props: { variant: 'primary', label: 'Primary' }
		},
		{
			title: 'Attention',
			props: { variant: 'attention', label: 'Warning' }
		},
		{
			title: 'Danger',
			props: { variant: 'danger', label: 'Danger' }
		},
		{
			title: 'Ghost',
			props: { variant: 'ghost', label: 'Ghost' }
		},
		{
			title: 'Quiet icon',
			props: { variant: 'quiet', size: 'compact', square: true, ariaLabel: 'Close' },
			content: icon('x')
		},
		{
			title: 'Link',
			props: { variant: 'link', label: 'Link Style' }
		},
		{
			title: 'Selected',
			props: { variant: 'selected', label: 'Selected' }
		},
		{
			title: 'Toggle',
			props: { toggle: true, label: 'Toggle me' }
		},
		{
			title: 'Disabled',
			props: { disabled: true, label: 'Disabled' }
		},
		{
			title: 'Disabled primary',
			props: { variant: 'primary', disabled: true, label: 'Primary' }
		}
	]
}
