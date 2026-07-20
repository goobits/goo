import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooTooltip from '../GooTooltip.svelte'
import * as gooTooltip from '../index.ts'

type GooTooltipInstance = ReturnType<typeof gooTooltip.createGooTooltip>

describe('GooTooltip', () => {
	afterEach(() => {
		vi.useRealTimers()
		gooTooltip.gooTooltipRuntime.destroy()
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		document
			.querySelectorAll('[aria-describedby]')
			.forEach(element => element.removeAttribute('aria-describedby'))
	})

	it('creates tooltips without registering a tooltip custom element', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const instance = gooTooltip.createGooTooltip({
			for: button,
			content: 'Save',
			trigger: 'manual'
		})

		instance.show()

		expect(document.querySelector('goo-tooltip')).toBeNull()
		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()
		expect(instance.visible).toBe(true)

		instance.destroy()
		button.remove()
	})

	it('renders markup-looking string content as plain text', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const instance = gooTooltip.createGooTooltip({
			for: button,
			content: '<strong>Save</strong>',
			trigger: 'manual'
		})

		instance.show()
		const tooltip = document.querySelector('.goo-popout.goo-tooltip')

		expect(tooltip?.textContent).toContain('<strong>Save</strong>')
		expect(tooltip?.querySelector('strong')).toBeNull()

		instance.destroy()
		button.remove()
	})

	it('preserves DOM structure for element content', () => {
		const button = document.createElement('button')
		const contentElement = document.createElement('span')
		const emphasizedText = document.createElement('strong')
		emphasizedText.textContent = 'Save'
		contentElement.append(emphasizedText)
		document.body.appendChild(button)
		const instance = gooTooltip.createGooTooltip({
			for: button,
			contentElement,
			trigger: 'manual'
		})

		instance.show()

		expect(document.querySelector('.goo-popout.goo-tooltip strong')).toBe(emphasizedText)

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
		const lifecycle = gooTooltip.tooltip(button, { content: 'Save', showDelay: 0 })

		button.dispatchEvent(new MouseEvent('mouseenter'))
		await new Promise(resolve => setTimeout(resolve)) // test-shape: timing-probe - documented test timing behavior.

		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()

		lifecycle.destroy()
		button.remove()
	})

	it('updates imperative manual tooltip content and position without recreating the popout', () => {
		gooTooltip.gooTooltipRuntime.show('12 x 24', {
			direction: 'right',
			position: { x: 10, y: 20 }
		})

		const firstPopout = document.querySelector('.goo-popout.goo-tooltip')
		expect(firstPopout).not.toBeNull()

		gooTooltip.gooTooltipRuntime.show('18 x 30', {
			direction: 'right',
			position: { x: 30, y: 40 }
		})

		const popouts = document.querySelectorAll('.goo-popout.goo-tooltip')
		expect(popouts).toHaveLength(1)
		expect(popouts[0]).toBe(firstPopout)
		expect(popouts[0].textContent).toContain('18 x 30')
	})

	it('shows an arrow for imperative manual tooltips', () => {
		gooTooltip.gooTooltipRuntime.show('100 x 80', {
			className: 'goo-tooltip--cursor-tip',
			direction: 'right',
			position: { x: 100, y: 100 }
		})

		const arrow = document.querySelector(
			'.goo-popout.goo-tooltip.goo-tooltip--cursor-tip .goo-popout__arrow'
		)
		expect(arrow).not.toBeNull()
		expect(arrow?.classList.contains('left')).toBe(true)
	})

	it('uses an exact point anchor and supports content-owned chrome', () => {
		const content = document.createElement('span')
		content.textContent = 'Sample'
		gooTooltip.gooTooltipRuntime.show(content, {
			chromeless: true,
			position: { x: 100, y: 80 }
		})

		const tooltip = document.querySelector('.goo-popout.goo-tooltip')
		const pointAnchor = Array.from(document.body.children).find(element =>
			element instanceof HTMLElement && element.style.position === 'fixed' && element.style.pointerEvents === 'none'
		) as HTMLElement | undefined
		expect(pointAnchor?.style.left).toBe('100px')
		expect(pointAnchor?.style.top).toBe('80px')
		expect(pointAnchor?.style.width).toBe('0px')
		expect(pointAnchor?.style.height).toBe('0px')
		expect(tooltip?.classList.contains('goo-popout--chromeless')).toBe(true)
		expect(tooltip?.querySelector('.goo-popout__arrow')).toBeNull()
	})

	it('removes interactive popout listeners when destroyed', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const instance = gooTooltip.createGooTooltip({
			for: button,
			content: 'Save',
			interactive: true,
			trigger: 'manual'
		})

		instance.show()
		const popout = document.querySelector<HTMLElement>('.goo-popout.goo-tooltip')!
		const removeEventListenerSpy = vi.spyOn(popout, 'removeEventListener')

		instance.destroy()

		expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function))
		expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function))
		button.remove()
	})

	it('replaces pending show timers and ignores public updates after destroy', () => {
		vi.useFakeTimers()
		const button = document.createElement('button')
		document.body.appendChild(button)
		const instance = gooTooltip.createGooTooltip({
			for: button,
			content: 'Save',
			showDelay: 50
		})

		button.dispatchEvent(new MouseEvent('mouseenter'))
		button.dispatchEvent(new MouseEvent('mouseenter'))

		expect(vi.getTimerCount()).toBe(1)

		instance.destroy()
		instance.setContent('Ignored')
		instance.updatePosition(button)
		instance.show()
		vi.runAllTimers()

		expect(document.querySelector('.goo-popout.goo-tooltip')).toBeNull()
		expect(button.getAttribute('aria-describedby')).toBeNull()
		button.remove()
	})
})
