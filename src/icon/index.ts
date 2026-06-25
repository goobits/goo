// Icon registry for storing SVG definitions
import { iconRegistry } from './registry.ts'
import type { GooIconProps } from './types.ts'

export { default as GooIcon } from './GooIcon.svelte'
export type { GooIconProps } from './types.ts'

/** Options for rendering registry-backed icon markup. */
export type GooIconRenderOptions = GooIconProps & {

	/** Icon name registered with the Goo icon registry. */
	value: string
}

/**
 * Render an inert icon placeholder that can be hydrated later.
 *
 * @param options - Icon rendering options.
 * @returns HTML for a `.goo-icon` span with `data-goo-icon`.
 */
export function renderIconPlaceholderHtml(options: GooIconRenderOptions): string {
	return renderIconMarkup(options, '', true)
}

/**
 * Render an icon span with the current registry SVG when it is available.
 *
 * @param options - Icon rendering options.
 * @returns HTML for a `.goo-icon` span.
 */
export function renderIconHtml(options: GooIconRenderOptions): string {
	const sizeValue = normalizeIconSize(options.size)
	const svg = iconRegistry.get(options.value, { size: Number.parseFloat(sizeValue) }) ?? ''
	return renderIconMarkup(options, svg)
}

/**
 * Replace all `[data-goo-icon]` placeholders under a root with registry SVGs.
 *
 * @param root - Parent node containing icon placeholder spans.
 */
export function renderIconPlaceholders(root: ParentNode): void {
	const icons = root.querySelectorAll<HTMLElement>('[data-goo-icon]')

	for (const icon of icons) {
		const value = icon.dataset.gooIcon ?? icon.dataset.value ?? ''
		if (!value) continue

		const sizeValue = normalizeIconSize(icon.dataset.size ?? icon.style.width)
		const svg = iconRegistry.get(value, { size: Number.parseFloat(sizeValue) })

		icon.classList.add('goo-icon')
		icon.dataset.value = value
		icon.style.width ||= sizeValue
		icon.style.height ||= sizeValue

		if (svg) {
			icon.innerHTML = svg
			setStrokeState(icon, svg)
		}
		delete icon.dataset.gooIcon
	}
}

function renderIconMarkup(options: GooIconRenderOptions, svg = '', isPlaceholder = false): string {
	const {
		value,
		disabled = false,
		class: className = '',
		style = '',
		label
	} = options
	const sizeValue = normalizeIconSize(options.size)
	const classes = [ 'goo-icon', className ].filter(Boolean).join(' ')
	const attrs: Array<[string, string] | null> = [
		[ 'class', classes ],
		isPlaceholder ? [ 'data-goo-icon', value ] : null,
		[ 'data-value', value ],
		[ 'data-size', sizeValue ],
		[ 'style', `width:${ sizeValue };height:${ sizeValue };${ style }` ],
		disabled ? [ 'data-disabled', 'true' ] : null,
		label ? [ 'aria-label', label ] : [ 'aria-hidden', 'true' ],
		label ? [ 'role', 'img' ] : null,
		svg && hasStrokeOnlyIcon(svg) ? [ 'data-stroke', '' ] : null
	]

	return `<span${ attrs.map(formatAttribute).join('') }>${ svg }</span>`
}

function formatAttribute(attribute: [string, string] | null): string {
	if (!attribute) return ''

	const [ name, value ] = attribute
	return value === '' ? ` ${ name }` : ` ${ name }="${ escapeAttribute(value) }"`
}

function normalizeIconSize(size: number | string | undefined): string {
	if (typeof size === 'number') {
		return `${ size }px`
	}
	if (typeof size === 'string') {
		const parsed = Number.parseFloat(size)
		return `${ Number.isFinite(parsed) ? parsed : 16 }px`
	}
	return '16px'
}

function hasStrokeOnlyIcon(svg: string): boolean {
	return svg.includes('fill="none"') || svg.includes("fill='none'")
}

function setStrokeState(icon: HTMLElement, svg: string): void {
	if (hasStrokeOnlyIcon(svg)) {
		icon.dataset.stroke = ''
	} else {
		delete icon.dataset.stroke
	}
}

function escapeAttribute(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}
