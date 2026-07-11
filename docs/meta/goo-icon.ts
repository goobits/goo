/**
 * Goo-docs metadata for the `GooIcon` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooIcon } from '../../src/icon/index.ts'

export default {
	id: 'goo-icon',
	component: GooIcon,
	examples: [
		{
			title: 'checkbox',
			props: { value: 'checkbox', size: 28 }
		},
		{
			title: 'save',
			props: { value: 'save', size: 28 }
		},
		{
			title: 'settings',
			props: { value: 'settings', size: 28 }
		},
		{
			title: 'close',
			props: { value: 'close', size: 28 }
		},
		{
			title: '12px',
			props: { value: 'mouse-pointer', size: 12 }
		},
		{
			title: '16px',
			props: { value: 'type', size: 16 }
		},
		{
			title: '24px',
			props: { value: 'palette', size: 24 }
		},
		{
			title: '32px',
			props: { value: 'settings', size: 32 }
		},
		{
			title: '48px',
			props: { value: 'image', size: 48 }
		}
	]
}
