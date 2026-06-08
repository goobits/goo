import type { GooPreviewBackground, GooPreviewFit, GooPreviewSize } from '../preview/types.ts'

/** Option metadata rendered by the shared grid popout picker. */
export interface GridPopoutSvgElement {
	attributes: Record<string, string>
	tag: 'circle' | 'line' | 'path' | 'rect'
}

/**
 * Grid popout svg icon.
 */
export interface GridPopoutSvgIcon {
	attributes?: Record<string, string>
	class?: string
	elements?: GridPopoutSvgElement[]
	paths: Array<{
		d: string
		transform?: string
	}>
	viewBox: string
}

/** Preview metadata rendered by grid popout triggers and options. */
export interface GridPopoutPreview {

	/** Alternative text for preview images. */
	alt?: string

	/** Preview background treatment. */
	background?: GooPreviewBackground

	/** Small badge pinned inside the preview. */
	badge?: string

	/** Media object fitting. */
	fit?: GooPreviewFit

	/** Decorative tint used by radial preview lighting. */
	hue?: string

	/** Preview size preset. */
	size?: GooPreviewSize

	/** Image URL for the preview. */
	src: string
}

/**
 * Grid popout item.
 */
export interface GridPopoutItem {
	ariaLabel?: string
	iconClass?: string
	iconSvg?: GridPopoutSvgIcon
	id: string
	kicker?: string
	preview?: GridPopoutPreview
	previewAlt?: string
	previewUrl?: string
	title: string
}
