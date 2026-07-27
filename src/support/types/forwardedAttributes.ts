/** Primitive values supported by forwarded DOM attributes. */
export type GooForwardedAttributeValue = string | number | boolean | null | undefined

/** Common DOM attributes that Goo components forward to their root element. */
export type GooForwardedAttributes = {
	dir?: 'auto' | 'ltr' | 'rtl' | null | undefined
	id?: string | null | undefined
	role?: string | null | undefined
	style?: string | null | undefined
	title?: string | null | undefined
	tabIndex?: number | null | undefined
	tabindex?: number | null | undefined
	draggable?: boolean | 'false' | 'true' | null | undefined
	[attribute: `aria-${ string }`]: GooForwardedAttributeValue
	[attribute: `data-${ string }`]: GooForwardedAttributeValue
}
