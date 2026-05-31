/**
 * @fileoverview Option normalization utilities for GooSelect.
 * Converts various input formats into a consistent GooSelectOption array.
 * @module goobits/select/normalizeOptions
 */

import type { GooSelectOption } from './types.js'

/**
 * Generate unique ID from label.
 * Converts to lowercase and replaces non-alphanumeric chars with dashes.
 * @param label - Label to convert
 * @returns ID string
 */
export function labelToId(label: string | number | undefined): string {
	return String(label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Normalize a single option object.
 * Handles various shorthand formats:
 * - Divider: { type: 'divider' } or '---' or '-'
 * - String: 'Label' → { type: 'option', label: 'Label', id: 'label' }
 * - Full object with all properties
 *
 * @param opt - Option to normalize
 * @returns Normalized option or null if invalid
 */
export function normalizeOption(opt: unknown): GooSelectOption | null {
	if (!opt) return null

	// Divider shorthand
	if ((opt as GooSelectOption).type === 'divider' || opt === '---' || opt === '-') {
		return { type: 'divider' }
	}

	// String shorthand
	if (typeof opt === 'string') {
		return { type: 'option', label: opt, id: labelToId(opt) }
	}

	const optObj = opt as Record<string, unknown>

	const normalized: GooSelectOption = {
		type: (optObj.type as GooSelectOption['type']) || 'option',
		label: (optObj.label || optObj.title || '') as GooSelectOption['label'],
		id: (optObj.id as string) || labelToId(optObj.label as string || optObj.title as string || ''),
		icon: optObj.icon as GooSelectOption['icon'],
		shortcut: optObj.shortcut as GooSelectOption['shortcut'],
		isDisabled: optObj.isDisabled as GooSelectOption['isDisabled'],
		isSupported: optObj.isSupported as GooSelectOption['isSupported'],
		onChoose: optObj.onChoose as GooSelectOption['onChoose']
	}

	// Recursively normalize child options
	if (optObj.options) {
		normalized.options = normalizeOptions(optObj.options as GooSelectOption[])
	}

	return normalized
}

/**
 * Normalize options from various input formats.
 * Supports:
 * - Array of strings: ['Option 1', 'Option 2']
 * - Array of objects: [{ label: 'Opt', id: 'opt' }]
 * - Object key-value pairs: { opt1: 'Label 1', opt2: 'Label 2' }
 * - Nested objects for optgroups/submenus
 *
 * @param options - Options in any supported format
 * @returns Normalized array of GooSelectOption
 */
export function normalizeOptions(options: unknown): GooSelectOption[] {
	if (!options) return []

	// Array of strings
	if (Array.isArray(options) && typeof options[0] === 'string') {
		return options.map(label => ({
			type: 'option' as const,
			label: label as string,
			id: labelToId(label as string)
		}))
	}

	// Array of objects
	if (Array.isArray(options)) {
		return options.map(normalizeOption).filter((opt): opt is GooSelectOption => opt !== null)
	}

	// Object key-value pairs
	if (typeof options === 'object' && options !== null) {
		const result: GooSelectOption[] = []

		for (const [ key, value ] of Object.entries(options as Record<string, unknown>)) {
			// Nested array = optgroup
			if (Array.isArray(value)) {
				result.push({
					type: 'optgroup',
					label: key,
					id: labelToId(key),
					options: normalizeOptions(value)
				})

			// Nested object = submenu (if no 'label' property)
			} else if (typeof value === 'object' && value !== null && !(value as Record<string, unknown>).label) {
				result.push({
					type: 'submenu',
					label: key,
					id: labelToId(key),
					options: normalizeOptions(value)
				})

			// Simple key-value (string)
			} else if (typeof value === 'string') {
				result.push({
					type: 'option',
					label: value,
					id: key
				})

			// Full object with label
			} else {
				const normalized = normalizeOption({ ...(value as object), id: key })
				if (normalized) result.push(normalized)
			}
		}
		return result
	}

	return []
}
