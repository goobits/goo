import { tick } from 'svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSvelteControlHost } from '../SvelteControl.svelte.ts'
import { reactiveControlTracker } from './_reactiveControlTracker.ts'
import ReactiveControl from './ReactiveControl.svelte'

describe('createSvelteControlHost', () => {
	beforeEach(() => {
		document.body.replaceChildren()
		reactiveControlTracker.mountCount = 0
	})

	it('updates mounted Svelte controls through reactive props without remounting', async() => {
		const onchange = vi.fn()
		const host = createSvelteControlHost({
			component: ReactiveControl,
			value: 12,
			options: {},
			onchange
		})
		const element = host.create()
		document.body.appendChild(element)

		host.setValue(24)
		await tick()

		expect(element.querySelector('.reactive-control')?.textContent?.trim()).toBe('24')
		expect(reactiveControlTracker.mountCount).toBe(1)
		expect(onchange).not.toHaveBeenCalled()

		host.destroy()
	})
})
