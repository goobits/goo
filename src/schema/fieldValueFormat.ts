import type { GooSchemaField } from './types.ts'

export function applyFieldValueFormatOptions(
	node: GooSchemaField,
	options: Record<string, unknown>
): void {
	const valueFormat = node.format ?? node.valueFormat
	if (valueFormat !== undefined) {
		options.format = valueFormat
	}

	if (node.displayUnit !== undefined) {
		options.unit = node.displayUnit
	}

	if (valueFormat === 'percent' && options.unit === undefined) {
		options.unit = '%'
	}

	if (node.ticks !== undefined) {
		options.ticks = node.ticks
	}
}
