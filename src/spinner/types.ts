/** Preset Goo spinner sizes. */
export type GooSpinnerSize = 'sm' | 'md' | 'lg'

/** Visual Goo spinner variants. */
export type GooSpinnerVariant = 'default' | 'rainbow'

/** Props accepted by the Svelte `GooSpinner` component. */
export type GooSpinnerProps = {

	/** Preset size or custom CSS length. */
	size?: GooSpinnerSize | number | string

	/** Stroke thickness in pixels or a CSS length. */
	thickness?: number | string

	/** Visual style. Defaults to the theme-colored spinner. */
	variant?: GooSpinnerVariant

	/** Accessible loading label. Defaults to `Loading`. */
	label?: string

	/** Render decoratively (no role/label) when another element announces loading. */
	ariaHidden?: boolean

	/** Extra class names. */
	class?: string
}

/** Options for rendering Goo spinner markup from non-Svelte callers. */
export type GooSpinnerRenderOptions = {

	/** Additional class names for the spinner element. */
	class?: string

	/** Accessible loading label. Defaults to `Loading`. */
	label?: string

	/** Preset size or custom CSS length. */
	size?: GooSpinnerSize | number | string

	/** Stroke thickness in pixels or a CSS length. */
	thickness?: number | string

	/** Visual style. Defaults to the theme-colored spinner. */
	variant?: GooSpinnerVariant
}
