import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import GooTooltip from '../GooTooltip.svelte'
import type { GooTooltipInstance } from '../index.ts'
import { createGooTooltip, gooTooltipRuntime, tooltip } from '../index.ts'

describe('GooTooltip', () => {
	afterEach(() => {
		gooTooltipRuntime.destroy()
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		document.querySelectorAll('[aria-describedby]').forEach(element => element.removeAttribute('aria-describedby'))
	})

	it('creates tooltips without registering a tooltip custom element', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const instance = createGooTooltip({ for: button, content: 'Save', trigger: 'manual' })

		instance.show()

		expect(document.querySelector('goo-tooltip')).toBeNull()
		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()
		expect(instance.visible).toBe(true)

		instance.destroy()
		button.remove()
	})

	it('binds the Svelte component instance for imperative control', async() => {
		const button = document.createElement('button')
		button.id = 'tooltip-target'
		document.body.appendChild(button)
		let instance: GooTooltipInstance | null = null

		render(GooTooltip, {
			props: {
				for: 'tooltip-target',
				content: 'Save',
				trigger: 'manual',
				get instance() {
					return instance
				},
				set instance(value) {
					instance = value
				}
			}
		})
		await tick()

		instance?.show()

		expect(instance?.visible).toBe(true)
		expect(button.getAttribute('aria-describedby')).toMatch(/^goo-tooltip-/)

		instance?.destroy()
		button.remove()
	})

	it('attaches tooltip behavior as a Svelte action', async() => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const lifecycle = tooltip(button, { content: 'Save', showDelay: 0 })

		button.dispatchEvent(new MouseEvent('mouseenter'))
		await new Promise(resolve => setTimeout(resolve))

		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()

		lifecycle.destroy()
		button.remove()
	})

	it('updates imperative manual tooltip content and position without recreating the popout', () => {
		gooTooltipRuntime.show('12 x 24', {
			direction: 'right',
			position: { x: 10, y: 20 }
		})

		const firstPopout = document.querySelector('.goo-popout.goo-tooltip')
		expect(firstPopout).not.toBeNull()

		gooTooltipRuntime.show('18 x 30', {
			direction: 'right',
			position: { x: 30, y: 40 }
		})

		const popouts = document.querySelectorAll('.goo-popout.goo-tooltip')
		expect(popouts).toHaveLength(1)
		expect(popouts[0]).toBe(firstPopout)
		expect(popouts[0].textContent).toContain('18 x 30')
	})

	it('shows an arrow for imperative manual tooltips', () => {
		gooTooltipRuntime.show('100 x 80', {
			className: 'goo-tooltip--cursor-tip',
			direction: 'right',
			position: { x: 100, y: 100 }
		})

		const arrow = document.querySelector('.goo-popout.goo-tooltip.goo-tooltip--cursor-tip .goo-popout__arrow')
		expect(arrow).not.toBeNull()
		expect(arrow?.classList.contains('left')).toBe(true)
	})
})
