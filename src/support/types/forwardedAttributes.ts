/** Primitive values supported by forwarded DOM attributes. */
export type GooForwardedAttributeValue = string | number | boolean | null | undefined

/** Common DOM attributes that Goo components forward to their root element. */
export type GooForwardedAttributes = {
	dir?: 'auto' | 'ltr' | 'rtl'
	id?: string
	role?: string
	style?: string
	title?: string
	tabIndex?: number
	tabindex?: number
	draggable?: boolean | 'false' | 'true'
	[attribute: `aria-${ string }`]: GooForwardedAttributeValue
	[attribute: `data-${ string }`]: GooForwardedAttributeValue
}
