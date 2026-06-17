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
			title: 'Constrained range',
			props: { title: 'Constrained range', value: [ 20, 70 ], minDistance: 20, maxDistance: 60 }
		},
		{
			title: 'Variance',
			props: { title: 'Variance', value: [ 30, 50, 70 ], mode: 'variance' }
		},
		{
			title: 'Variance collapsed',
			props: { title: 'Variance collapsed', value: [ 50, 50, 50 ], variance: true }
		},
		{
			title: 'Variance near edge',
			props: { title: 'Variance near edge', value: [ 0, 15, 30 ], variance: true }
		},
		{
			title: 'Variance edge compressed',
			props: { title: 'Variance edge compressed', value: [ 80, 100, 100 ], variance: true }
		},
		{
			title: 'Vertical variance',
			props: { title: 'Vertical variance', value: [ 25, 50, 75 ], variance: true, direction: 'vertical', style: 'height: 120px;' }
		},
		{
			title: 'Ticks and labels',
			props: {
				title: 'Ticks and labels',
				value: 50,
				ticks: 4,
				marks: [
					{ value: 0, label: '0' },
					{ value: 50, label: '50' },
					{ value: 100, label: '100' }
				]
			}
		},
		{
			title: 'Snap points',
			props: { title: 'Snap points', value: 50, marks: [ 0, 25, 50, 75, 100 ], snap: true }
		},
		{
			title: 'Log scale',
			props: { title: 'Log scale', value: 10, min: 1, max: 100, scale: 'log', ticks: 2, valueBubble: true }
		},
		{
			title: 'Value bubble',
			props: { title: 'Value bubble', value: 42, valueBubble: 'always' }
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
