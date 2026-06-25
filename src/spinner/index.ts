import './GooSpinner.css'

import { resolveSpinnerAttrs } from './_spinnerAttrs.ts'
import type { GooSpinnerRenderOptions } from './types.ts'

export { default as GooSpinner } from './GooSpinner.svelte'
export type { GooSpinnerProps, GooSpinnerRenderOptions, GooSpinnerSize, GooSpinnerVariant } from './types.ts'

/**
 * Render Goo spinner HTML for non-Svelte callers (imperative DOM / string templates).
 *
 * @param options - Spinner rendering options.
 * @returns HTML for a `.goo-spinner` element.
 */
export function renderGooSpinnerHtml(options: GooSpinnerRenderOptions = {}): string {
	const resolved = resolveSpinnerAttrs(options)
	const attributes: Array<[string, string | undefined]> = [
		[ 'class', [ 'goo-spinner', options.class ].filter(Boolean).join(' ') ],
		[ 'role', 'status' ],
		[ 'aria-label', options.label ?? 'Loading' ],
		[ 'size', resolved.sizeAttr ],
		[ 'variant', resolved.variantAttr ],
		[ 'style', resolved.style ]
	]

	return `<div${ attributes.map(formatAttribute).join('') }></div>`
}

function formatAttribute(attribute: [string, string | undefined]): string {
	const [ name, value ] = attribute
	if (!value) {
		return ''
	}

	return ` ${ name }="${ escapeAttribute(value) }"`
}

function escapeAttribute(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}
