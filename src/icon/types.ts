/** Props for the Goo icon component. */
export interface GooIconProps {

	/** Icon name registered with the Goo icon registry. */
	value?: string

	/** Icon size in pixels. */
	size?: number | string

	/** Renders the icon in a disabled visual state. */
	disabled?: boolean

	/** Additional CSS classes. */
	class?: string

	/** Inline style forwarded to the icon wrapper. */
	style?: string

	/** Accessible label for meaningful icons; omitted icons are decorative. */
	label?: string
}
