import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Background treatment for preview surfaces. */
export type GooPreviewBackground = 'checker' | 'dots' | 'plain'

/** Object fitting used for preview media. */
export type GooPreviewFit = 'contain' | 'cover'

/** Preview surface size preset. */
export type GooPreviewSize = 'sm' | 'md' | 'lg'

/** Props accepted by the Svelte `GooPreview` component. */
export type GooPreviewProps = GooForwardedAttributes & {

	/** Accessible label for non-decorative previews. */
	ariaLabel?: string

	/** Alternative text for image previews. */
	alt?: string

	/** Preview background treatment. */
	background?: GooPreviewBackground

	/** Small text badge pinned inside the preview. */
	badge?: string

	/** Extra class names. */
	class?: string

	/** Optional child content, such as an SVG or canvas host. */
	children?: Snippet

	/** Media object fitting. */
	fit?: GooPreviewFit

	/** Fixed CSS height. */
	height?: string

	/** Decorative tint used by radial preview lighting. */
	hue?: string

	/** Image URL for the preview. */
	src?: string

	/** Preview size preset. */
	size?: GooPreviewSize

	/** Inline style string. */
	style?: string

	/** Text label rendered below the media. */
	title?: string
}
