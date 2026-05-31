import type { GooSpinnerSize, GooSpinnerVariant } from './types.ts'

/** Spinner presentation resolved from size / thickness / variant inputs. */
export type ResolvedSpinnerAttrs = {

	/** Preset size attribute (`sm` | `md` | `lg`), when a preset was given. */
	sizeAttr?: GooSpinnerSize

	/** `rainbow` when the rainbow variant was requested. */
	variantAttr?: 'rainbow'

	/** CSS custom-property declarations (size/stroke), or undefined when none. */
	style?: string
}

/**
 * Resolve a spinner's size/thickness/variant into class-markup attributes and
 * CSS custom properties, shared by `GooSpinner.svelte` and `renderGooSpinnerHtml`.
 * @param input - input.
 */
export function resolveSpinnerAttrs(input: {
	size?: GooSpinnerSize | number | string
	thickness?: number | string
	variant?: GooSpinnerVariant
}): ResolvedSpinnerAttrs {
	const declarations: string[] = []

	let sizeAttr: GooSpinnerSize | undefined
	const sizeLength = resolveSizeLength(input.size)
	if (isPresetSize(input.size)) {
		sizeAttr = input.size
	} else if (sizeLength) {
		declarations.push(`--goo-spinner-size: ${ sizeLength }`)
	}

	const stroke = resolveStroke(input.thickness)
	if (stroke) {
		declarations.push(`--goo-spinner-stroke: ${ stroke }`)
	}

	return {
		sizeAttr,
		variantAttr: input.variant === 'rainbow' ? 'rainbow' : undefined,
		style: declarations.length ? declarations.join('; ') : undefined
	}
}

function isPresetSize(size: unknown): size is GooSpinnerSize {
	return size === 'sm' || size === 'md' || size === 'lg'
}

function resolveSizeLength(size: GooSpinnerSize | number | string | undefined): string | null {
	if (size === undefined || isPresetSize(size)) {
		return null
	}

	if (typeof size === 'number') {
		return Number.isFinite(size) && size > 0 ? `${ size }px` : null
	}

	const parsed = Number.parseFloat(size)
	return Number.isFinite(parsed) ? `${ parsed }px` : null
}

function resolveStroke(thickness: number | string | undefined): string | null {
	if (thickness === undefined) {
		return null
	}

	if (typeof thickness === 'number') {
		return Number.isFinite(thickness) && thickness > 0 ? `${ thickness }px` : null
	}

	return formatCssLength(thickness)
}

function formatCssLength(value: string): string | null {
	const trimmed = value.trim()
	if (!trimmed) {
		return null
	}

	if (/^\d*\.?\d+$/.test(trimmed)) {
		const parsed = Number.parseFloat(trimmed)
		return Number.isFinite(parsed) && parsed > 0 ? `${ parsed }px` : null
	}

	if (/^\d*\.?\d+(px|rem|em|ch|vh|vw|vmin|vmax|%)$/.test(trimmed)) {
		return trimmed
	}

	return null
}
