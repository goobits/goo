import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooVortexComponent from '../GooVortex.svelte'
import { createGooVortex } from '../index.ts'
import type { GooVortexComponentHandle } from '../types.ts'

describe('GooVortex', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('creates, updates, and destroys vortex elements', async() => {
		const host = document.createElement('div')
		document.body.append(host)
		const vortex = createGooVortex(host, {
			imageUrls: [ '/media/vortex.png' ]
		})

		vortex.create({
			id: 'asset-1',
			message: 'Loading',
			point: { x: 100, y: 120 }
		})

		const element = host.querySelector('.goo-vortex') as HTMLElement | null
		expect(element?.querySelector('[data-goo-vortex-message]')?.textContent).toBe('Loading')
		expect(element?.querySelector('img')?.getAttribute('src')).toBe('/media/vortex.png')
		expect(vortex.has('asset-1')).toBe(true)
		expect(vortex.ids()).toEqual([ 'asset-1' ])

		vortex.update('asset-1', 'Still loading')
		flushSync()
		expect(element?.querySelector('[data-goo-vortex-message]')?.textContent).toBe('Still loading')

		vortex.update({ id: 'asset-1', message: 'Done' })
		flushSync()
		expect(element?.querySelector('[data-goo-vortex-message]')?.textContent).toBe('Done')

		await vortex.destroy('asset-1')
		flushSync()
		expect(vortex.has('asset-1')).toBe(false)
		expect(element?.dataset.state).toBe('exiting')

		host.remove()
	})

	it('clears pending enter timers when unmounted', async() => {
		vi.useFakeTimers()
		const host = document.createElement('div')
		document.body.append(host)
		const instance = mount(GooVortexComponent, {
			target: host,
			props: { message: 'Loading' }
		}) as GooVortexComponentHandle
		flushSync()

		instance.enter({ x: 100, y: 120 })
		expect(vi.getTimerCount()).toBe(1)
		await unmount(instance)
		expect(vi.getTimerCount()).toBe(0)

		vi.useRealTimers()
		host.remove()
	})

	it('clears pending manager enter timers when destroyed before enter starts', async() => {
		vi.useFakeTimers()
		const host = document.createElement('div')
		document.body.append(host)
		const vortex = createGooVortex(host)

		vortex.create({
			id: 'asset-1',
			message: 'Loading',
			point: { x: 100, y: 120 }
		})
		const element = host.querySelector('.goo-vortex') as HTMLElement | null
		expect(vi.getTimerCount()).toBe(1)

		const destroyed = vortex.destroy('asset-1')
		vi.advanceTimersByTime(1)
		flushSync()

		expect(element?.dataset.state).not.toBe('entering')

		vi.advanceTimersByTime(20)
		await destroyed
		flushSync()

		expect(element?.dataset.state).toBe('exiting')
		host.remove()
	})

	it('clear cancels pending manager enter timers for every active vortex', async() => {
		vi.useFakeTimers()
		const host = document.createElement('div')
		document.body.append(host)
		const vortex = createGooVortex(host)

		vortex.create({ id: 'asset-1', point: { x: 100, y: 120 } })
		vortex.create({ id: 'asset-2', point: { x: 140, y: 160 } })
		const elements = Array.from(host.querySelectorAll<HTMLElement>('.goo-vortex'))
		expect(vi.getTimerCount()).toBe(2)

		const cleared = vortex.clear()
		vi.advanceTimersByTime(1)
		flushSync()

		expect(elements.map(element => element.dataset.state)).not.toContain('entering')

		vi.advanceTimersByTime(20)
		await cleared

		expect(vortex.ids()).toEqual([])
		host.remove()
	})
})
