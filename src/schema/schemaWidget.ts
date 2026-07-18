import type { GooSchemaWidget } from './types.ts'

/** Define a self-contained, label-free named GooSchema widget node. */
export function defineGooSchemaWidget(
	widget: string,
	options: Omit<GooSchemaWidget, 'type' | 'widget'> = {}
): GooSchemaWidget {
	return {
		layout: 'self-contained',
		showLabel: false,
		...options,
		type: 'widget',
		widget
	}
}
