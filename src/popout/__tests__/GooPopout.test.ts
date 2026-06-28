import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooPopout from '../GooPopout.svelte'
import type { GooPopoutInstance } from '../index.ts'
import { createGooPopout } from '../index.ts'

describe('GooPopout', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		vi.useRealTimers()
	})

	it('creates native popout elements without custom tags', () => {
		const target = document.createElement('button')
		document.body.appendChild(target)
		const content = document.createElement('div')
		content.textContent = 'Menu'
		const instance = createGooPopout({ at: target, content: content, openImmediately: false })

		instance.open()

		expect(document.querySelector('goo-popout')).toBeNull()
		expect(document.querySelector('.goo-popout')).not.toBeNull()
		expect(instance.isOpen()).toBe(true)

		instance.destroy()
		target.remove()
	})

	it('positions after opening content settles', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const target = document.createElement('button')
		const content = document.createElement('div')
		let popoutWidth = 40

		document.body.appendChild(target)
		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 300, 200)
			if (this === target) return rect(260, 20, 20, 20)
			if (this.classList.contains('goo-popout')) return rect(0, 0, popoutWidth, 40)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			const instance = createGooPopout({
				at: target,
				content: content,
				align: 'left to right',
				offset: { x: 6, y: 0 },
				keepWithin: { element: document.documentElement, margin: 12 },
				openImmediately: false
			})

			const openPromise = instance.open()
			const popout = document.querySelector<HTMLElement>('.goo-popout')!
			expect(popout.style.visibility).toBe('hidden')

			requestAnimationFrame(() => {
				popoutWidth = 180
				content.appendChild(document.createElement('span'))
			})

			await openPromise

			expect(popout.style.visibility).toBe('')
			expect(Number.parseFloat(popout.style.left)).toBe(74)

			await instance.destroy()
		} finally {
			target.remove()
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('reports the resolved arrow side after containment flips horizontally', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const target = document.createElement('button')
		const content = document.createElement('div')
		const onPosition = vi.fn()

		document.body.appendChild(target)
		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 300, 200)
			if (this === target) return rect(260, 20, 30, 20)
			if (this.classList.contains('goo-popout')) return rect(0, 0, 120, 40)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			const instance = createGooPopout({
				at: target,
				content: content,
				align: 'left to right',
				offset: { x: 6, y: 0 },
				keepWithin: { element: document.documentElement, margin: 12 },
				onPosition,
				openImmediately: false
			})

			await instance.open()

			expect(instance.position?.flippedX).toBe(true)
			expect(instance.position?.arrowPosition).toBe('right')
			expect(document.querySelector('.goo-popout__arrow')?.classList.contains('right')).toBe(true)
			expect(onPosition).toHaveBeenCalled()

			await instance.destroy()
		} finally {
			target.remove()
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('keeps final contained placement outside avoid rectangles', async() => {
		await withAvoidRectPopout(({ popout }) => {
			expect(Number.parseFloat(popout.style.left)).toBe(140)
			expect(Number.parseFloat(popout.style.top)).toBe(20)
		})
	})

	it('reports the resolved arrow side after avoid rectangles move placement sideways', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const target = document.createElement('button')
		const content = document.createElement('div')

		document.body.appendChild(target)
		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 420, 240)
			if (this === target) return rect(210, 100, 0, 0)
			if (this.classList.contains('goo-popout')) return rect(0, 0, 90, 60)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			const instance = createGooPopout({
				at: {
					avoidRects: [ { bottom: 240, left: 120, right: 220, top: 0 } ],
					point: { x: 210, y: 100 }
				},
				content: content,
				align: 'top left to bottom left',
				offset: { x: 0, y: 4 },
				keepWithin: { element: document.documentElement, margin: 12 },
				openImmediately: false
			})

			await instance.open()

			const popout = document.querySelector<HTMLElement>('.goo-popout')!
			expect(Number.parseFloat(popout.style.left)).toBe(220)
			expect(Number.parseFloat(popout.style.top)).toBe(104)
			expect(instance.position?.arrowPosition).toBe('left')
			expect(document.querySelector('.goo-popout__arrow')?.classList.contains('left')).toBe(true)

			await instance.destroy()
		} finally {
			target.remove()
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('clears avoid rectangles when updating to an anchor without them', async() => {
		await withAvoidRectPopout(async({ instance, popout }) => {
			instance.updatePosition({ point: { x: 140, y: 100 } })
			await nextAnimationFrame()

			expect(Number.parseFloat(popout.style.left)).toBe(140)
			expect(Number.parseFloat(popout.style.top)).toBe(104)
		})
	})

	it('repositions when visible content grows after opening', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const target = document.createElement('button')
		const content = document.createElement('div')
		let popoutHeight = 30

		document.body.appendChild(target)
		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 300, 200)
			if (this === target) return rect(20, 140, 20, 20)
			if (this.classList.contains('goo-popout')) return rect(0, 0, 80, popoutHeight)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			const instance = createGooPopout({
				at: target,
				content: content,
				align: 'left to right',
				offset: { x: 6, y: 0 },
				keepWithin: { element: document.documentElement, margin: 12 },
				openImmediately: false
			})

			await instance.open()
			const popout = document.querySelector<HTMLElement>('.goo-popout')!
			expect(Number.parseFloat(popout.style.top)).toBe(135)

			popoutHeight = 120
			content.appendChild(document.createElement('span'))
			await nextAnimationFrame()

			expect(Number.parseFloat(popout.style.top)).toBe(68)

			await instance.destroy()
		} finally {
			target.remove()
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('repositions when the target anchor resizes while open', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const originalResizeObserver = globalThis.ResizeObserver
		const target = document.createElement('button')
		const content = document.createElement('div')
		let targetWidth = 20
		let resizeCallback: ResizeObserverCallback | undefined

		vi.stubGlobal('ResizeObserver', class ResizeObserver {
			constructor(callback: ResizeObserverCallback) {
				resizeCallback = callback
			}

			observe() {}
			disconnect() {}
			unobserve() {}
		})

		document.body.appendChild(target)
		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 400, 300)
			if (this === target) return rect(40, 40, targetWidth, 20)
			if (this.classList.contains('goo-popout')) return rect(0, 0, 80, 40)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			const instance = createGooPopout({
				at: target,
				content: content,
				align: 'left to right',
				offset: { x: 6, y: 0 },
				keepWithin: { element: document.documentElement, margin: 12 },
				openImmediately: false
			})

			await instance.open()
			const popout = document.querySelector<HTMLElement>('.goo-popout')!
			expect(Number.parseFloat(popout.style.left)).toBe(66)

			targetWidth = 80
			resizeCallback?.([], {} as ResizeObserver)
			await nextAnimationFrame()

			expect(Number.parseFloat(popout.style.left)).toBe(126)

			await instance.destroy()
		} finally {
			target.remove()
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
			vi.stubGlobal('ResizeObserver', originalResizeObserver)
		}
	})

	it('drops chrome and arrow when chromeless is true', () => {
		const target = document.createElement('button')
		document.body.appendChild(target)
		const content = document.createElement('div')
		const instance = createGooPopout({
			at: target,
			content: content,
			chromeless: true,
			openImmediately: false
		})

		instance.open()

		const popout = document.querySelector<HTMLElement>('.goo-popout')!
		expect(popout.classList.contains('goo-popout--chromeless')).toBe(true)
		expect(popout.querySelector('.goo-popout__arrow')).toBeNull()

		instance.destroy()
		target.remove()
	})

	it('keeps full chrome when chromeless is unset (default)', () => {
		const target = document.createElement('button')
		document.body.appendChild(target)
		const content = document.createElement('div')
		const instance = createGooPopout({ at: target, content: content, openImmediately: false })

		instance.open()

		const popout = document.querySelector<HTMLElement>('.goo-popout')!
		expect(popout.classList.contains('goo-popout--chromeless')).toBe(false)
		expect(popout.querySelector('.goo-popout__arrow')).not.toBeNull()

		instance.destroy()
		target.remove()
	})

	it('does not fire onOpen after closing during the opening animation', async() => {
		const target = document.createElement('button')
		const content = document.createElement('div')
		const onOpen = vi.fn()
		document.body.appendChild(target)
		const instance = createGooPopout({
			at: target,
			content: content,
			onOpen,
			openImmediately: false
		})

		const openPromise = instance.open()
		await instance.close()
		await openPromise

		expect(onOpen).not.toHaveBeenCalled()
		expect(instance.isOpen()).toBe(false)

		target.remove()
	})

	it('closes on Escape before opening layout settles without owning focus', async() => {
		const target = document.createElement('button')
		const content = document.createElement('div')
		document.body.appendChild(target)
		target.focus()
		const instance = createGooPopout({
			at: target,
			content,
			initialFocus: 'none',
			openImmediately: false
		})

		try {
			const openPromise = instance.open()
			const escape = new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Escape'
			})
			document.dispatchEvent(escape)
			await openPromise
			await delay(180)

			expect(escape.defaultPrevented).toBe(true)
			expect(instance.isOpen()).toBe(false)
			expect(document.querySelector('.goo-popout')).toBeNull()
			expect(document.activeElement).toBe(target)
		} finally {
			await instance.destroy()
			target.remove()
		}
	})

	it('binds the Svelte component instance for imperative control', async() => {
		const target = document.createElement('button')
		target.id = 'popout-target'
		document.body.appendChild(target)
		let instance: GooPopoutInstance | null = null

		render(GooPopout, {
			props: {
				target: 'popout-target',
				get instance() {
					return instance
				},
				set instance(value) {
					instance = value
				}
			}
		})
		await tick()

		instance?.open()

		expect(instance?.isOpen()).toBe(true)
		expect(document.querySelector('.goo-popout[for="popout-target"]')).not.toBeNull()

		instance?.destroy()
		target.remove()
	})

	it('does not remount from a queued prop-change microtask after unmount', async() => {
		const firstTarget = document.createElement('button')
		const secondTarget = document.createElement('button')
		firstTarget.id = 'first-popout-target'
		secondTarget.id = 'second-popout-target'
		document.body.append(firstTarget, secondTarget)
		const { rerender, unmount } = render(GooPopout, {
			props: {
				target: 'first-popout-target',
				open: true
			}
		})
		await tick()

		await rerender({
			target: 'second-popout-target',
			open: true
		})
		unmount()
		await Promise.resolve()
		await delay(180)

		expect(document.querySelector('.goo-popout')).toBeNull()
		firstTarget.remove()
		secondTarget.remove()
	})
})

function rect(x: number, y: number, width: number, height: number): DOMRect {
	return {
		x,
		y,
		width,
		height,
		left: x,
		top: y,
		right: x + width,
		bottom: y + height,
		toJSON: () => ({})
	} as DOMRect
}

async function withAvoidRectPopout(
	run: (fixture: { instance: GooPopoutInstance; popout: HTMLElement }) => Promise<void> | void
): Promise<void> {
	const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
	const target = document.createElement('button')
	const content = document.createElement('div')
	let instance: GooPopoutInstance | undefined

	document.body.appendChild(target)
	HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
		if (this === document.documentElement) return rect(0, 0, 300, 240)
		if (this === target) return rect(140, 100, 0, 0)
		if (this.classList.contains('goo-popout')) return rect(0, 0, 90, 60)
		return originalGetBoundingClientRect.call(this)
	}

	try {
		instance = createGooPopout({
			at: {
				avoidRects: [ { bottom: 170, left: 120, right: 220, top: 80 } ],
				point: { x: 140, y: 100 }
			},
			content: content,
			align: 'top left to bottom left',
			offset: { x: 0, y: 4 },
			keepWithin: { element: document.documentElement, margin: 12 },
			openImmediately: false
		})

		await instance.open()
		await run({ instance, popout: document.querySelector<HTMLElement>('.goo-popout')! })
	} finally {
		await instance?.destroy()
		target.remove()
		HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
	}
}

function nextAnimationFrame(): Promise<void> {
	return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms)) // test-shape: timing-probe - waits for popout close animation.
}
