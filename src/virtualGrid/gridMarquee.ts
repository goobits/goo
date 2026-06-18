import { createLifecycleBag } from '../support/utils/lifecycleBag.ts'

/**
 * Rect XYWH.
 */
export interface RectXYWH { x: number; y: number; width: number; height: number }

/**
 * Grid marquee mode.
 */
export type GridMarqueeMode = 'replace' | 'additive'

/**
 * Grid marquee options.
 */
export interface GridMarqueeOptions {
	getInitialSelection: () => Set<string>
	apply: (hits: Set<string>, mode: GridMarqueeMode, initial: Set<string>) => void
	itemSelector?: string
	keyAttribute?: string
	overlayClass?: string
}

interface CachedItem { key: string; x: number; y: number; w: number; h: number }

const DEFAULT_ITEM_SELECTOR = '.thumb[data-key]'
const DEFAULT_KEY_ATTRIBUTE = 'data-key'
const DEFAULT_OVERLAY_CLASS = 'goo-grid-marquee'
const DRAG_THRESHOLD = 3

/**
 * Rect intersects.
 *
 * @param a - a.
 * @param b - b.
 */
export function rectIntersects(a: RectXYWH, b: RectXYWH): boolean {
	return a.x < b.x + b.width
		&& a.x + a.width > b.x
		&& a.y < b.y + b.height
		&& a.y + a.height > b.y
}

/**
 * Grid marquee.
 *
 * @param node - node.
 * @param opts - opts.
 */
export function gridMarquee(node: HTMLElement, opts: GridMarqueeOptions) {
	const lifecycle = createLifecycleBag()
	let trackingLifecycle = createLifecycleBag()
	let activeLifecycle = createLifecycleBag()
	lifecycle.add(trackingLifecycle)
	lifecycle.add(activeLifecycle)
	let tracking = false
	let active = false
	let dragged = false
	let raf = 0
	let startX = 0
	let startY = 0
	let pendingX = 0
	let pendingY = 0
	let mode: GridMarqueeMode = 'replace'
	let initial = new Set<string>()
	let overlay: HTMLDivElement | null = null
	let pointerId = -1
	let cachedItems: CachedItem[] | null = null
	let scrollAncestor: HTMLElement | null = null

	function pointerdown(e: PointerEvent) {
		if (e.button !== 0) return
		if (isNonDraggable(e.target)) return
		if (!node.contains(e.target as Node)) return

		tracking = true
		active = false
		dragged = false
		pointerId = e.pointerId
		startX = e.clientX
		startY = e.clientY
		pendingX = startX
		pendingY = startY
		mode = e.shiftKey || e.metaKey || e.ctrlKey ? 'additive' : 'replace'
		initial = opts.getInitialSelection()

		trackingLifecycle.destroy()
		trackingLifecycle = createLifecycleBag()
		lifecycle.add(trackingLifecycle)
		trackingLifecycle.listen(document, 'pointermove', trackMove)
		trackingLifecycle.listen(document, 'pointerup', trackingEnd, true)
		trackingLifecycle.listen(document, 'pointercancel', trackingEnd, true)
	}

	function trackMove(e: PointerEvent) {
		if (!tracking || e.pointerId !== pointerId) return
		const dx = Math.abs(e.clientX - startX)
		const dy = Math.abs(e.clientY - startY)
		if (Math.max(dx, dy) < DRAG_THRESHOLD) return
		e.preventDefault()
		promote(e)
	}

	function trackingEnd(e: PointerEvent) {
		if (e.pointerId !== pointerId) return
		tearDownTracking()
	}

	function tearDownTracking() {
		if (!tracking) return
		tracking = false
		trackingLifecycle.destroy()
	}

	function promote(e: PointerEvent) {
		tearDownTracking()
		activeLifecycle.destroy()
		activeLifecycle = createLifecycleBag()
		lifecycle.add(activeLifecycle)
		active = true
		dragged = true
		node.setPointerCapture?.(e.pointerId)

		overlay = document.createElement('div')
		overlay.className = opts.overlayClass ?? DEFAULT_OVERLAY_CLASS

		// The overlay rect is computed in viewport (client) coordinates, so it must
		// be positioned against the viewport. Set this structurally here (rather than
		// relying on shipped CSS) and leave appearance to the overlay class.
		overlay.style.position = 'fixed'
		overlay.style.pointerEvents = 'none'
		node.appendChild(overlay)

		activeLifecycle.listen(node, 'pointermove', move)
		activeLifecycle.listen(node, 'pointerup', end)
		activeLifecycle.listen(node, 'pointercancel', end)

		readItemsIntoCache()
		scrollAncestor = findScrollableAncestor(node)
		if (scrollAncestor) {
			activeLifecycle.listen(scrollAncestor, 'scroll', invalidateItemCache, { passive: true })
		}

		pendingX = e.clientX
		pendingY = e.clientY
		update(pendingX, pendingY)
	}

	function readItemsIntoCache() {
		const out: CachedItem[] = []
		const selector = opts.itemSelector ?? DEFAULT_ITEM_SELECTOR
		const keyAttribute = opts.keyAttribute ?? DEFAULT_KEY_ATTRIBUTE
		for (const item of node.querySelectorAll<HTMLElement>(selector)) {
			const r = item.getBoundingClientRect()
			const k = item.getAttribute(keyAttribute)
			if (k) out.push({ key: k, x: r.left, y: r.top, w: r.width, h: r.height })
		}
		cachedItems = out
	}

	function invalidateItemCache() { cachedItems = null }

	function move(e: PointerEvent) {
		if (!active) return
		pendingX = e.clientX
		pendingY = e.clientY
		if (!raf) raf = requestAnimationFrame(() => {
			raf = 0
			update(pendingX, pendingY)
		})
	}

	function update(x: number, y: number) {
		const rect = {
			x: Math.min(startX, x),
			y: Math.min(startY, y),
			width: Math.abs(x - startX),
			height: Math.abs(y - startY)
		}

		if (overlay) {
			overlay.style.left = `${ rect.x }px`
			overlay.style.top = `${ rect.y }px`
			overlay.style.width = `${ rect.width }px`
			overlay.style.height = `${ rect.height }px`
		}

		if (cachedItems === null) readItemsIntoCache()
		const hits = new Set<string>()
		for (const item of cachedItems!) {
			if (rectIntersects(rect, { x: item.x, y: item.y, width: item.w, height: item.h })) {
				hits.add(item.key)
			}
		}
		opts.apply(hits, mode, initial)
	}

	function end(e?: PointerEvent) {
		if (!active) return
		active = false
		if (raf) cancelAnimationFrame(raf)
		raf = 0
		if (e && node.hasPointerCapture?.(e.pointerId)) node.releasePointerCapture(e.pointerId)
		overlay?.remove()
		overlay = null
		activeLifecycle.destroy()
		scrollAncestor = null
		cachedItems = null

		if (dragged) {
			const block = (ev: MouseEvent) => {
				ev.stopPropagation()
				clickBlockLifecycle.destroy()
			}
			const clickBlockLifecycle = createLifecycleBag()
			lifecycle.add(clickBlockLifecycle)
			clickBlockLifecycle.listen(window, 'click', block, true)
			clickBlockLifecycle.timeout(() => clickBlockLifecycle.destroy(), 50)
		}
	}

	lifecycle.listen(node, 'pointerdown', pointerdown)

	return {
		destroy() {
			tearDownTracking()
			end()
			lifecycle.destroy()
		}
	}
}

function isNonDraggable(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return true
	return !!target.closest('input, textarea, [contenteditable="true"], .thumb[data-key]')
}

function findScrollableAncestor(el: HTMLElement): HTMLElement | null {
	let cur: HTMLElement | null = el
	while (cur && cur !== document.body) {
		const overflow = getComputedStyle(cur).overflowY
		if (overflow === 'auto' || overflow === 'scroll') return cur
		cur = cur.parentElement
	}
	return null
}
