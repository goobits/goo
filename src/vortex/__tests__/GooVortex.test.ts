import { flushSync } from 'svelte'
import { describe, expect, it } from 'vitest'

import { createGooVortex } from '../index.ts'

describe('GooVortex', () => {
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
})
