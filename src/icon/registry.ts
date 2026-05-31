/**
 * @fileoverview Icon Registry - Central storage for SVG icon definitions
 *
 * Apps register their icons at startup, then GooIcon components or icon
 * rendering helpers look up SVGs from this registry.
 *
 * @example
 * // Register icons at app startup
 * import { iconRegistry } from '@goobits/goo/icon'
 * import { pencil, eraser } from './my-icons.js'
 *
 * iconRegistry.registerAll({ pencil, eraser })
 *
 * // Then render with <GooIcon value="pencil" size={20} />
 *
 * SECURITY: registered SVG is rendered verbatim via `{@html}` in `GooIcon` and
 * the raw-HTML icon helpers, so it is NOT sanitized. Only register SVG from
 * trusted, author-controlled sources (build-time icon modules). Never register
 * SVG derived from user input or untrusted remote data — doing so is a stored
 * XSS vector. Sanitize at the source if such input must be supported.
 *
 * @module goo/icon/registry
 */

// =============================================================================
// Icon Storage
// =============================================================================

const icons = new Map()

// =============================================================================
// Registry API
// =============================================================================

/**
 * Icon registry for storing and retrieving SVG icon definitions.
 */
export const iconRegistry = {
	/**
	 * Register a single icon. The SVG must come from a trusted source — it is
	 * rendered unsanitized via `{@html}`. See the module-level SECURITY note.
	 * @param {string} name - Icon name.
	 * @param {string|Function} svg - SVG string or function returning SVG string
	 */
	register(name, svg) {
		icons.set(name, svg)
	},

	/**
	 * Register multiple icons at once.
	 * @param {Object<string, string|Function>} iconMap - Map of name -> SVG
	 */
	registerAll(iconMap) {
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
	get(name, options = {}) {
		const icon = icons.get(name)
		if (!icon) return null

		// Support both string SVGs and factory functions
		if (typeof icon === 'function') {
			return icon(options)
		}
		return icon
	},

	/**
	 * Check if an icon is registered.
	 * @param {string} name - Icon name
	 * @returns {boolean}
	 */
	has(name) {
		return icons.has(name)
	},

	/**
	 * Get all registered icon names.
	 * @returns {string[]}
	 */
	list() {
		return Array.from(icons.keys())
	},

	/**
	 * Remove an icon from the registry.
	 * @param {string} name - Icon name
	 * @returns {boolean} True if icon was removed
	 */
	unregister(name) {
		return icons.delete(name)
	},

	/**
	 * Clear all registered icons.
	 */
	clear() {
		icons.clear()
	}
}

export default iconRegistry
