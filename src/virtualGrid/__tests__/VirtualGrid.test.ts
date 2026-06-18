import { render } from '@testing-library/svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import { gridMarquee } from '../gridMarquee.ts'
import Harness from './VirtualGridHarness.svelte'

describe('VirtualGrid', () => {
	const originalResizeObserver = globalThis.ResizeObserver

	beforeAll(() => {
		// jsdom has no matchMedia; VirtualGrid probes it for constrained devices on init.
		vi.stubGlobal('matchMedia', (query: string) => ({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {}
		}))
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.stubGlobal('ResizeObserver', originalResizeObserver)
	})

	it('defaults the container to role="presentation" with no semantic aria', () => {
		const { container } = render(Harness, { props: {} })
		const grid = container.querySelector('.goo-virtual-grid')!

		expect(grid.getAttribute('role')).toBe('presentation')
		expect(grid.getAttribute('aria-label')).toBeNull()
		expect(grid.getAttribute('aria-rowcount')).toBeNull()
		expect(grid.getAttribute('aria-multiselectable')).toBeNull()
	})

	it('exposes a semantic grid container when accessibility props are set', () => {
		const { container } = render(Harness, {
			props: {
				role: 'grid',
				ariaLabel: 'Documents',
				ariaRowCount: 42,
				ariaMultiselectable: true
			}
		})
		const grid = container.querySelector('.goo-virtual-grid')!

		expect(grid.getAttribute('role')).toBe('grid')
		expect(grid.getAttribute('aria-label')).toBe('Documents')
		expect(grid.getAttribute('aria-rowcount')).toBe('42')
		expect(grid.getAttribute('aria-multiselectable')).toBe('true')
	})

	it('removes listeners from the same mounted elements when unmounted', () => {
		const scrollRoot = document.createElement('div')
		document.body.appendChild(scrollRoot)
		const rootRemoveEventListenerSpy = vi.spyOn(scrollRoot, 'removeEventListener')
		const { container, unmount } = render(Harness, {
			props: { scrollRoot }
		})
		const grid = container.querySelector<HTMLElement>('.goo-virtual-grid')!
		const gridRemoveEventListenerSpy = vi.spyOn(grid, 'removeEventListener')

		unmount()

		expect(gridRemoveEventListenerSpy).toHaveBeenCalledWith('virtualgridnavigate', expect.any(Function))
		expect(rootRemoveEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
		scrollRoot.remove()
	})

	it('mounts and unmounts when ResizeObserver is unavailable', () => {
		vi.stubGlobal('ResizeObserver', undefined)
		const scrollRoot = document.createElement('div')
		document.body.appendChild(scrollRoot)
		const { unmount } = render(Harness, {
			props: { scrollRoot }
		})

		expect(() => unmount()).not.toThrow()
		scrollRoot.remove()
	})

	it('tears down marquee tracking and click-block work when destroyed', () => {
		vi.useFakeTimers()
		const node = document.createElement('div')
		node.setPointerCapture = vi.fn()
		node.releasePointerCapture = vi.fn()
		document.body.appendChild(node)
		const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
		const removeWindowListener = vi.spyOn(window, 'removeEventListener')
		const marquee = gridMarquee(node, {
			apply: vi.fn(),
			getInitialSelection: () => new Set()
		})

		node.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0, pointerId: 4 }))
		document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 10, pointerId: 4 }))
		node.dispatchEvent(pointerEvent('pointerup', { clientX: 10, clientY: 10, pointerId: 4 }))
		marquee.destroy()
		vi.runAllTimers()

		expect(removeDocumentListener).toHaveBeenCalledWith('pointermove', expect.any(Function), undefined)
		expect(removeDocumentListener).toHaveBeenCalledWith('pointerup', expect.any(Function), true)
		expect(removeDocumentListener).toHaveBeenCalledWith('pointercancel', expect.any(Function), true)
		expect(removeWindowListener).toHaveBeenCalledWith('click', expect.any(Function), true)
		node.remove()
	})
})
