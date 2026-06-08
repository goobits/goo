import type { GooSchemaField, GooSchemaFieldLayout } from './types.ts'

export type ControllerFieldLayout = 'inline' | 'stacked'

export function getControllerFieldLayout(node: GooSchemaField): ControllerFieldLayout | undefined {
	if (node.layout === 'inline' || node.layout === 'stacked') {
		return node.layout
	}

	return undefined
}

export function isSelfContainedField(node: GooSchemaField): boolean {
	return node.selfContained === true || node.layout === 'self-contained'
}

export function isFullBleedField(node: GooSchemaField): boolean {
	return node.fullBleed === true || node.layout === 'full-bleed'
}

export function normalizeFieldLayout(layout: GooSchemaFieldLayout | undefined): GooSchemaFieldLayout | undefined {
	return layout
}
