/**
 * Scroll affordances: edge fades plus floating chevron buttons that appear
 * while the scroller can move in that direction. Attach to any scroll
 * container whose positioned parent should host the overlays.
 */
import './scrollAffordances.css'

const CHEVRON_UP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>'
const CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
const EDGE_EPSILON = 4

export type ScrollAffordances = {
	destroy(): void
	update(): void
}

export type ScrollAffordancesOptions = {
	/** Positioned overlay host; defaults to the scroller's parent element. */
	host?: HTMLElement

	/** Fraction of the viewport each chevron press scrolls. */
	step?: number
}

export function attachScrollAffordances(
	scroller: HTMLElement,
	{ host = scroller.parentElement ?? scroller, step = 0.8 }: ScrollAffordancesOptions = {}
): ScrollAffordances {
	host.classList.add('goo-scroll-affordances')
	const overlays = [
		createFade('top'),
		createFade('bottom'),
		createButton('up', CHEVRON_UP, () => scrollBy(-step)),
		createButton('down', CHEVRON_DOWN, () => scrollBy(step))
	]
	const [ topFade, bottomFade, upButton, downButton ] = overlays
	host.append(...overlays)

	function scrollBy(amount: number): void {
		scroller.scrollBy({ behavior: 'smooth', top: amount * scroller.clientHeight })
	}

	function update(): void {
		const canUp = scroller.scrollTop > EDGE_EPSILON
		const canDown = scroller.scrollTop
			< scroller.scrollHeight - scroller.clientHeight - EDGE_EPSILON
		topFade.classList.toggle('goo-scroll-affordances--show', canUp)
		upButton.classList.toggle('goo-scroll-affordances--show', canUp)
		bottomFade.classList.toggle('goo-scroll-affordances--show', canDown)
		downButton.classList.toggle('goo-scroll-affordances--show', canDown)
	}

	scroller.addEventListener('scroll', update, { passive: true })
	const resizeObserver = new ResizeObserver(update)
	resizeObserver.observe(scroller)
	for (const child of scroller.children) resizeObserver.observe(child)
	update()

	return {
		destroy() {
			scroller.removeEventListener('scroll', update)
			resizeObserver.disconnect()
			for (const overlay of overlays) overlay.remove()
			host.classList.remove('goo-scroll-affordances')
		},
		update
	}
}

function createFade(edge: 'top' | 'bottom'): HTMLElement {
	const fade = document.createElement('div')
	fade.className = `goo-scroll-affordances__fade goo-scroll-affordances__fade--${ edge }`
	fade.setAttribute('aria-hidden', 'true')
	return fade
}

function createButton(
	direction: 'up' | 'down',
	chevron: string,
	onPress: () => void
): HTMLElement {
	const button = document.createElement('button')
	button.type = 'button'
	button.className = `goo-scroll-affordances__button goo-scroll-affordances__button--${ direction }`
	button.setAttribute('aria-label', direction === 'up' ? 'Scroll up' : 'Scroll down')
	button.tabIndex = -1
	button.innerHTML = chevron
	button.addEventListener('click', onPress)
	return button
}
