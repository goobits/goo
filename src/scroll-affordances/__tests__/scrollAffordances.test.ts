import { beforeAll, describe, expect, it, vi } from 'vitest'

import { attachScrollAffordances } from '../scrollAffordances.ts'

beforeAll(() => {
	vi.stubGlobal('ResizeObserver', class {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	})
})

function createScroller(): HTMLElement {
	const host = document.createElement('div')
	const scroller = document.createElement('div')
	host.append(scroller)
	document.body.append(host)
	return scroller
}

describe('attachScrollAffordances', () => {
	it('mounts fades and chevron buttons on the host and cleans them up', () => {
		const scroller = createScroller()
		const host = scroller.parentElement as HTMLElement
		const affordances = attachScrollAffordances(scroller)

		expect(host.classList.contains('goo-scroll-affordances')).toBe(true)
		expect(host.querySelectorAll('.goo-scroll-affordances__fade')).toHaveLength(2)
		expect(host.querySelectorAll('.goo-scroll-affordances__button')).toHaveLength(2)

		affordances.destroy()
		expect(host.classList.contains('goo-scroll-affordances')).toBe(false)
		expect(host.querySelectorAll('[class^="goo-scroll-affordances"]')).toHaveLength(0)
	})

	it('shows direction affordances only while that direction can scroll', () => {
		const scroller = createScroller()
		const host = scroller.parentElement as HTMLElement
		Object.defineProperties(scroller, {
			clientHeight: { configurable: true, value: 100 },
			scrollHeight: { configurable: true, value: 300 }
		})
		scroller.scrollTop = 0
		const affordances = attachScrollAffordances(scroller)

		const up = host.querySelector('.goo-scroll-affordances__button--up') as HTMLElement
		const down = host.querySelector('.goo-scroll-affordances__button--down') as HTMLElement
		expect(up.classList.contains('goo-scroll-affordances--show')).toBe(false)
		expect(down.classList.contains('goo-scroll-affordances--show')).toBe(true)

		scroller.scrollTop = 150
		affordances.update()
		expect(up.classList.contains('goo-scroll-affordances--show')).toBe(true)
		expect(down.classList.contains('goo-scroll-affordances--show')).toBe(true)

		scroller.scrollTop = 200
		affordances.update()
		expect(down.classList.contains('goo-scroll-affordances--show')).toBe(false)
		affordances.destroy()
	})

	it('pages the scroller when a chevron is pressed', () => {
		const scroller = createScroller()
		Object.defineProperties(scroller, {
			clientHeight: { configurable: true, value: 100 },
			scrollHeight: { configurable: true, value: 300 }
		})
		scroller.scrollBy = vi.fn()
		const affordances = attachScrollAffordances(scroller)

		const host = scroller.parentElement as HTMLElement
		;(host.querySelector('.goo-scroll-affordances__button--down') as HTMLElement).click()
		expect(scroller.scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', top: 80 })
		affordances.destroy()
	})
})
