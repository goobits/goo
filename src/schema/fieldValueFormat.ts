import type { GooSchemaField } from './types.ts'

export function applyFieldValueFormatOptions(
	node: GooSchemaField,
	options: Record<string, unknown>
): void {
	const format = node.format
	if (format !== undefined) {
		options.format = format
	}

	if (node.displayUnit !== undefined) {
		options.unit = node.displayUnit
	}

	if (format === 'percent' && options.unit === undefined) {
		options.unit = '%'
	}

	if (node.ticks !== undefined) {
		options.ticks = node.ticks
	}
}
