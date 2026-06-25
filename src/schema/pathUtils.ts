/**
 * @fileoverview Path utilities for GooSchema - array-aware dot-notation path traversal
 * @module goobits/schema/pathUtils
 */

// ============================================================================
// Internal Helpers
// ============================================================================

interface ParsedSegment {
	key: string | number
	isIndex: boolean
}

/**
 * Parse path segment - handles both object keys and array indices
 * @example parseSegment("name") → { key: "name", isIndex: false }
 * @example parseSegment("0") → { key: 0, isIndex: true }
 * @example parseSegment("[0]") → { key: 0, isIndex: true }
 * @param segment - segment.
 */
function parseSegment(segment: string): ParsedSegment {
	// Handle bracket notation: "[0]" or "[name]"
	const bracketMatch = segment.match(/^\[(\d+|.+)\]$/)
	if (bracketMatch) {
		const inner = bracketMatch[1]
		const num = parseInt(inner, 10)
		if (!isNaN(num) && String(num) === inner) {
			return { key: num, isIndex: true }
		}
		return { key: inner, isIndex: false }
	}

	// Handle numeric string: "0", "1", etc.
	const num = parseInt(segment, 10)
	if (!isNaN(num) && String(num) === segment) {
		return { key: num, isIndex: true }
	}

	return { key: segment, isIndex: false }
}

/**
 * Split path into segments, handling both dot notation and brackets
 * @example splitPath("layers.0.enabled") → ["layers", "0", "enabled"]
 * @example splitPath("layers[0].enabled") → ["layers", "0", "enabled"]
 * @example splitPath("items[2]") → ["items", "2"]
 * @param path - path.
 */
function splitPath(path: string): string[] {
	if (!path) return []

	const segments: string[] = []
	let current = ''
	let i = 0

	while (i < path.length) {
		const char = path[i]

		if (char === '.') {
			// Dot separator - push current segment
			if (current) {
				segments.push(current)
				current = ''
			}
			i++
		} else if (char === '[') {
			// Bracket notation - push current segment and parse bracket
			if (current) {
				segments.push(current)
				current = ''
			}

			// Find closing bracket
			const closeIdx = path.indexOf(']', i)
			if (closeIdx === -1) {
				// Malformed - treat rest as segment
				current = path.slice(i)
				break
			}

			// Extract content between brackets (without the brackets)
			const bracketContent = path.slice(i + 1, closeIdx)
			segments.push(bracketContent)
			i = closeIdx + 1

			// Skip dot after bracket if present
			if (path[i] === '.') i++
		} else {
			current += char
			i++
		}
	}

	if (current) {
		segments.push(current)
	}

	return segments
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get value at dot-notation path (array-aware)
 * @example getByPath(obj, "layers.0.enabled") → obj.layers[0].enabled
 * @example getByPath(obj, "layers[0].enabled") → obj.layers[0].enabled
 * @param path - path.
 * @param obj - obj.
 */
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
	if (!path) return obj
	const segments = splitPath(path)

	let current: unknown = obj
	for (const segment of segments) {
		if (current == null) return undefined
		const { key } = parseSegment(segment)
		current = (current as Record<string | number, unknown>)[key]
	}
	return current
}

/**
 * Set value at dot-notation path (array-aware)
 * @example setByPath(obj, "layers.0.enabled", true) → obj.layers[0].enabled = true
 * @throws {Error} if path traverses through non-existent or non-object/array values
 * @param value - value.
 * @param path - path.
 * @param obj - obj.
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
	const segments = splitPath(path)
	if (segments.length === 0) {
		throw new Error('[GooSchema] Cannot set value at empty path')
	}

	const lastSegment = segments.pop()!
	const { key: lastKey } = parseSegment(lastSegment)

	let current: Record<string | number, unknown> = obj
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i]
		const { key } = parseSegment(segment)

		if (current[key] == null) {
			// Look ahead to determine if we should create array or object.
			// Use an index check so an empty next segment isn't skipped via `||`.
			const nextSegment = i + 1 < segments.length ? segments[i + 1] : lastSegment
			const { isIndex: nextIsIndex } = parseSegment(nextSegment)
			current[key] = nextIsIndex ? [] : {}
		}

		current = current[key] as Record<string | number, unknown>

		if (typeof current !== 'object' || current === null) {
			const traversedPath = segments.slice(0, i + 1).join('.')
			throw new Error(
				`[GooSchema] Cannot traverse path "${ path }" - "${ traversedPath }" is not an object`
			)
		}
	}

	current[lastKey] = value
}

/**
 * Resolve path to parent object and property name (array-aware)
 * @example resolvePath(obj, "layers.0.enabled")
 *          → { object: obj.layers[0], property: "enabled" }
 * @returns null if path cannot be resolved
 * @param root - root.
 * @param path - path.
 */
export function resolvePath(
	root: Record<string, unknown>,
	path: string
): { object: Record<string, unknown>; property: string } | null {
	const segments = splitPath(path)
	if (segments.length === 0) {
		return null
	}

	const lastSegment = segments.pop()!
	const { key: property } = parseSegment(lastSegment)

	let object: unknown = root
	for (const segment of segments) {
		if (object == null) {
			return null
		}
		const { key } = parseSegment(segment)
		object = (object as Record<string | number, unknown>)[key]
	}

	if (object == null) {
		return null
	}

	return { object: object as Record<string, unknown>, property: String(property) }
}

/**
 * Convert a key to human-readable label
 * @example keyToLabel("lineWidth") → "Line Width"
 * @example keyToLabel("color0") → "Color 0"
 * @param key - key.
 */
function keyToLabel(key: string): string {
	return key
		.replace(/([A-Z])/g, ' $1')
		.replace(/(\d+)/g, ' $1')
		.replace(/^./, s => s.toUpperCase())
		.trim()
}

/**
 * Convert path to human-readable label
 * @example pathToLabel("tip.bristles.count") → "Count"
 * @example pathToLabel("stroke.lineWidth") → "Line Width"
 * @example pathToLabel("layers.0.enabled") → "Enabled"
 * @example pathToLabel("layers.0") → "Layers"
 * @example pathToLabel("items[2]") → "Items"
 * @param path - path.
 */
export function pathToLabel(path: string): string {
	const segments = splitPath(path)
	const lastSegment = segments.pop() || path
	const { key, isIndex } = parseSegment(lastSegment)

	// If last segment is an index, try the one before
	if (isIndex && segments.length > 0) {
		const prevSegment = segments.pop()!
		const { key: prevKey } = parseSegment(prevSegment)
		return keyToLabel(String(prevKey))
	}

	return keyToLabel(String(key))
}
