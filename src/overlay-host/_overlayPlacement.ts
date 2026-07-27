export const GOO_OVERLAY_HOST_ATTRIBUTE = 'data-goo-overlay-host'
export const GOO_OVERLAY_SCOPE_ATTRIBUTE = 'data-goo-overlay-scope'

export type GooOverlayPlacement = {
	host: HTMLElement
	scope: HTMLElement
}

export const resolveGooOverlayPlacement = (
	anchor: Element | null | undefined
): GooOverlayPlacement | null => {
	if (!(anchor instanceof Element)) return null
	const scope = anchor.closest<HTMLElement>(`[${ GOO_OVERLAY_SCOPE_ATTRIBUTE }]`)
	if (!scope) return null
	const host = Array.from(scope.children).find(
		(element): element is HTMLElement =>
			element instanceof HTMLElement && element.hasAttribute(GOO_OVERLAY_HOST_ATTRIBUTE)
	)
	return host ? { host, scope } : null
}
