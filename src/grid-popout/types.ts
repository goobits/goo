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

/**
 * Grid popout item.
 */
export interface GridPopoutItem {
	ariaLabel?: string
	iconClass?: string
	iconSvg?: GridPopoutSvgIcon
	id: string
	previewAlt?: string
	previewUrl?: string
	title: string
}
