/**
 * Goo-docs metadata for the `GooSpinner` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooSpinner } from '../../src/spinner/index.ts'

export default {
	id: 'goo-spinner',
	component: GooSpinner,
	examples: [
		{
			title: 'Small',
			props: { size: 'sm' }
		},
		{
			title: 'Medium',
			props: { size: 'md' }
		},
		{
			title: 'Large',
			props: { size: 'lg' }
		},
		{
			title: 'Custom 48px',
			props: { size: 48 }
		},
		{
			title: 'Custom 72px',
			props: { size: 72 }
		},
		{
			title: 'Rainbow medium',
			props: { size: 'md', variant: 'rainbow', label: 'Loading rainbow spinner' }
		},
		{
			title: 'Rainbow large',
			props: { size: 'lg', variant: 'rainbow', label: 'Loading rainbow spinner' }
		},
		{
			title: 'Thickness 2px',
			props: { size: 'lg', thickness: 2 }
		},
		{
			title: 'Thickness 4px',
			props: { size: 'lg', thickness: 4 }
		},
		{
			title: 'Rainbow 4px',
			props: { size: 'lg', thickness: 4, variant: 'rainbow', label: 'Loading thick rainbow spinner' }
		},
		{
			title: 'Saving changes…',
			props: { size: 'sm', label: 'Saving changes' }
		}
	]
}
