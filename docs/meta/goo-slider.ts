/**
 * Goo-docs metadata for the `GooSlider` Svelte component.
 *
 * This file is build-time docs data only. It is never imported by runtime
 * package code and is not in `package.json#exports`.
 */

import { GooSlider } from '../../src/slider/index.ts'

export default {
	id: 'goo-slider',
	component: GooSlider,
	defaultProps: {
		value: 50,
		min: 0,
		max: 100,
		step: 1,
		title: 'Default'
	},
	examples: [
		{
			title: 'Default 0-100',
			props: { title: 'Default', value: 50, min: 0, max: 100 }
		},
		{
			title: 'Range -50 to 50',
			props: { title: 'Custom', value: 0, min: -50, max: 50 }
		},
		{
			title: 'Step 0.1',
			props: { title: 'Step', value: 0.5, min: 0, max: 1, step: 0.1 }
		},
		{
			title: 'Dual 20-80',
			props: { title: 'Dual', value: [ 20, 80 ], canPush: true }
		},
		{
			title: 'Variance',
			props: { title: 'Variance', value: [ 30, 50, 70 ], variance: true }
		},
		{
			title: 'Disabled',
			props: { title: 'Disabled', value: 30, disabled: true }
		},
		{
			title: 'Opacity',
			props: { title: 'Opacity', value: 75, preset: 'opacity', presetColor: '#3b82f6' }
		},
		{
			title: 'Hue',
			props: { title: 'Hue', value: 180, min: 0, max: 360, preset: 'hue' }
		},
		{
			title: 'Saturation',
			props: { title: 'Saturation', value: 50, preset: 'saturation', presetHue: 200 }
		},
		{
			title: 'Brightness',
			props: { title: 'Brightness', value: 50, preset: 'brightness' }
		}
	]
}
