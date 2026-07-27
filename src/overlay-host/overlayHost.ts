import { getContext, setContext } from 'svelte'

import {
	GOO_OVERLAY_HOST_ATTRIBUTE,
	GOO_OVERLAY_SCOPE_ATTRIBUTE,
	type GooOverlayPlacement,
	resolveGooOverlayPlacement } from './_overlayPlacement.ts'

export type GooOverlayHost = {
	element: () => HTMLElement | null
	scope: () => HTMLElement | null
}

export type GooOverlayPortalAction = {
	destroy: () => void
	update: (_host: GooOverlayHost | null) => void
}

const gooOverlayHostContext = Symbol('goo-overlay-host')

export const provideGooOverlayHost = (host: GooOverlayHost): GooOverlayHost => {
	setContext(gooOverlayHostContext, host)
	return host
}

export const useGooOverlayHost = (): GooOverlayHost | null =>
	getContext<GooOverlayHost | undefined>(gooOverlayHostContext) ?? null

export const portalToGooOverlayHost = (
	node: HTMLElement,
	initialHost: GooOverlayHost | null
): GooOverlayPortalAction => {
	const anchor = document.createComment('goo-overlay-portal')
	node.before(anchor)
	node.dataset.gooOverlayPortal = ''
	let host = initialHost
	let frame = 0

	const move = (): void => {
		const target = host?.element()
		if (target && node.parentElement !== target) target.append(node)
	}

	queueMicrotask(move)
	frame = requestAnimationFrame(move)

	return {
		update(nextHost) {
			host = nextHost
			move()
		},
		destroy() {
			cancelAnimationFrame(frame)
			node.remove()
			anchor.remove()
		}
	}
}

export {
	GOO_OVERLAY_HOST_ATTRIBUTE,
	GOO_OVERLAY_SCOPE_ATTRIBUTE,
	type GooOverlayPlacement,
	resolveGooOverlayPlacement }
