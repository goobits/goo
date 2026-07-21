/**
 * @fileoverview Icon Registry - Central storage for SVG icon definitions
 *
 * Apps register their icons at startup, then GooIcon components or icon
 * rendering helpers look up SVGs from this registry.
 *
 * @example
 * // Register icons at app startup
 * import { iconRegistry } from '@goobits/goo/icon/registry'
 * import { pencil, eraser } from './my-icons.js'
 *
 * iconRegistry.registerAll({ pencil, eraser })
 *
 * // Then render with <GooIcon value="pencil" size={20} />
 *
 * SECURITY: registered SVG is sanitized before rendering. The sanitizer keeps
 * common static SVG icon shapes and removes scripts, event handlers, external
 * references, and unsupported elements.
 *
 * @module goo/icon/registry
 */

// =============================================================================
// Icon Storage
// =============================================================================

type IconOptions = { size?: number }
type IconDefinition = string | ((options: IconOptions) => string)

/** Lucide icon node shape (`lucide` package): child tags with attributes. */
export type LucideIconNode = [tag: string, attrs: Record<string, string | number>][]

const icons = new Map<string, IconDefinition>()
const allowedSvgElements = new Set([
	'svg',
	'g',
	'path',
	'line',
	'polyline',
	'polygon',
	'circle',
	'ellipse',
	'rect',
	'defs',
	'clippath',
	'mask',
	'lineargradient',
	'radialgradient',
	'stop',
	'title',
	'desc',
	'use'
])
const allowedSvgAttributes = new Set([
	'aria-hidden',
	'aria-label',
	'class',
	'clip-path',
	'clip-rule',
	'cx',
	'cy',
	'd',
	'fill',
	'fill-opacity',
	'fill-rule',
	'focusable',
	'gradienttransform',
	'gradientunits',
	'height',
	'href',
	'id',
	'mask',
	'offset',
	'opacity',
	'points',
	'r',
	'role',
	'rx',
	'ry',
	'stop-color',
	'stroke',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit',
	'stroke-opacity',
	'stroke-width',
	'transform',
	'viewbox',
	'width',
	'x',
	'x1',
	'x2',
	'xmlns',
	'y',
	'y1',
	'y2'
])
const localReferenceAttributes = new Set([ 'clip-path', 'href', 'mask' ])

function isLocalReference(value: string): boolean {
	return value.startsWith('#') || /^url\(\s*#[^)]+\s*\)$/u.test(value)
}

function sanitizeSvgElement(element: Element): boolean {
	const tagName = element.localName.toLowerCase()
	if (!allowedSvgElements.has(tagName)) return false

	for (const attributeName of element.getAttributeNames()) {
		const normalizedName = attributeName.toLowerCase()
		const value = element.getAttribute(attributeName) ?? ''
		if (
			normalizedName.startsWith('on') ||
			!allowedSvgAttributes.has(normalizedName) ||
			(localReferenceAttributes.has(normalizedName) && !isLocalReference(value))
		) {
			element.removeAttribute(attributeName)
		}
	}

	for (const child of Array.from(element.children)) {
		if (!sanitizeSvgElement(child)) {
			child.remove()
		}
	}

	return true
}

function sanitizeSvg(svg: string): string | null {
	const trimmed = svg.trim()
	if (!trimmed || typeof DOMParser === 'undefined') return null

	const document = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
	const root = document.documentElement
	if (document.querySelector('parsererror') || root.localName.toLowerCase() !== 'svg') {
		return null
	}
	if (!sanitizeSvgElement(root)) return null

	return root.outerHTML
}

// =============================================================================
// Registry API
// =============================================================================

/**
 * Icon registry for storing and retrieving SVG icon definitions.
 */
export const iconRegistry = {
	/**
	 * Register a single icon. SVG is sanitized when read from the registry.
	 * @param {string} name - Icon name.
	 * @param {string|Function} svg - SVG string or function returning SVG string
	 */
	register(name: string, svg: IconDefinition) {
		icons.set(name, svg)
	},

	/**
	 * Register multiple icons at once.
	 * @param {Object<string, string|Function>} iconMap - Map of name -> SVG
	 */
	registerAll(iconMap: Record<string, IconDefinition>) {
		for (const [ name, svg ] of Object.entries(iconMap)) {
			icons.set(name, svg)
		}
	},

	/**
	 * Get an icon's SVG content.
	 * @param {string} name - Icon name
	 * @param {Object} [options] - Options passed to icon function
	 * @param {number} [options.size] - Icon size
	 * @returns {string|null} SVG string or null if not found
	 */
	get(name: string, options: IconOptions = {}) {
		const icon = icons.get(name)
		if (!icon) return null

		// Support both string SVGs and factory functions
		if (typeof icon === 'function') {
			return sanitizeSvg(icon(options))
		}
		return sanitizeSvg(icon)
	},

	/**
	 * Check if an icon is registered.
	 * @param {string} name - Icon name
	 * @returns {boolean}
	 */
	has(name: string) {
		return icons.has(name)
	},

	/**
	 * Get all registered icon names.
	 * @returns {string[]}
	 */
	list() {
		return Array.from(icons.keys())
	}
}

/**
 * Register Lucide icon nodes (from the `lucide` package) as stroke icons,
 * serialized with the library's standard svg attributes.
 * @param {Object<string, LucideIconNode>} iconMap - Map of name -> icon node
 */
export function registerLucideIcons(iconMap: Record<string, LucideIconNode>): void {
	iconRegistry.registerAll(Object.fromEntries(
		Object.entries(iconMap).map(([ name, node ]) => [ name, lucideIconSvg(node) ])
	))
}

/** Serialize a Lucide icon node to a registry-compatible svg string. */
export function lucideIconSvg(node: LucideIconNode): string {
	const children = node
		.map(([ tag, attrs ]) => {
			const serialized = Object.entries(attrs)
				.map(([ key, value ]) => `${ key }="${ value }"`)
				.join(' ')
			return `<${ tag } ${ serialized }/>`
		})
		.join('')
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em"'
		+ ` fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ children }</svg>`
}
