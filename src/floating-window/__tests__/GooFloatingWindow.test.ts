import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	createGooFloatingWindow,
	hideFocusedGooFloatingWindow,
	normalizeFloatingWindowSettings
} from '../index.js'

describe('GooFloatingWindow', () => {
	const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

	afterEach(() => {
		HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		document.body.innerHTML = ''
	})

	it('restores legacy JSON-string settings from storage', async() => {
		const container = createContainer()
		const element = createElement(container)

		const floatingWindow = createGooFloatingWindow({
			containment: container,
			display: 'block',
			element,
			id: 'sketch-FloatingToolbar',
			position: 'top right',
			right: 10,
			storage: {
				get: () => '{"display":"block","hAlign":"right","right":0.2,"top":0.1,"vAlign":"top"}',
				set: vi.fn()
			}
		})

		await floatingWindow.ready

		expect(element.style.right).toBe('120px')
		expect(element.style.top).toBe('50px')
		expect(element.classList.contains('opened')).toBe(true)
	})

	it('records plain settings through the storage adapter', async() => {
		const container = createContainer()
		const element = createElement(container)
		const set = vi.fn()

		const floatingWindow = createGooFloatingWindow({
			containment: container,
			display: 'block',
			element,
			id: 'toolbar',
			position: 'top right',
			right: 10,
			storage: { get: vi.fn(), set }
		})

		await floatingWindow.ready
		floatingWindow.show()

		expect(set).toHaveBeenCalledWith('toolbar', expect.objectContaining({
			display: 'block',
			format: '%',
			hAlign: 'right',
			vAlign: 'top'
		}))
	})

	it('flips horizontal alignment while preserving visible position', async() => {
		const container = createContainer()
		const element = createElement(container)
		const floatingWindow = createGooFloatingWindow({
			containment: container,
			display: 'block',
			element,
			id: 'toolbar',
			position: 'top right',
			right: 10
		})

		await floatingWindow.ready
		floatingWindow.flipHorizontal()

		expect(floatingWindow.settings.hAlign).toBe('left')
		expect(element.style.left).toBe('470px')
		expect(element.style.right).toBe('')
	})

	it('tracks focused floating windows for keyboard dismissal', async() => {
		const container = createContainer()
		const element = createElement(container)
		const floatingWindow = createGooFloatingWindow({
			containment: container,
			display: 'block',
			element,
			id: 'dismissable',
			position: 'top left'
		})

		await floatingWindow.ready
		floatingWindow.focus()

		expect(hideFocusedGooFloatingWindow()).toBe(true)
		expect(floatingWindow.isOpen()).toBe(false)

		floatingWindow.destroy()
		expect(hideFocusedGooFloatingWindow()).toBe(false)
	})

	it('does not consume focused non-closeable windows', async() => {
		const container = createContainer()
		const element = createElement(container)
		const floatingWindow = createGooFloatingWindow({
			closeable: false,
			containment: container,
			display: 'block',
			element,
			id: 'toolbar',
			position: 'top left'
		})

		await floatingWindow.ready
		floatingWindow.focus()

		expect(hideFocusedGooFloatingWindow()).toBe(false)
		expect(floatingWindow.isOpen()).toBe(true)
	})

	it('exposes the containment rect used by client overflow logic', async() => {
		const container = createContainer()
		const element = createElement(container)
		const floatingWindow = createGooFloatingWindow({
			containment: container,
			element,
			id: 'contained'
		})

		await floatingWindow.ready

		expect(floatingWindow.getContainmentRect().width).toBe(600)
	})

	it('rejects invalid persisted settings', () => {
		expect(normalizeFloatingWindowSettings('{')).toBeNull()
		expect(normalizeFloatingWindowSettings([])).toBeNull()
		expect(normalizeFloatingWindowSettings(3)).toBeNull()
	})

	function createContainer(): HTMLElement {
		const container = document.createElement('div')
		document.body.appendChild(container)
		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 800, 600)
			if (this === document.body) return rect(0, 0, 800, 600)
			if (this === container) return rect(0, 0, 600, 500)
			if (this.classList.contains('toolbar')) {
				const left = Number.parseFloat((this as HTMLElement).style.left) || 470
				const top = Number.parseFloat((this as HTMLElement).style.top) || 10
				return rect(left, top, 120, 40)
			}
			return originalGetBoundingClientRect.call(this)
		}
		return container
	}

	function createElement(container: HTMLElement): HTMLElement {
		const element = document.createElement('div')
		element.className = 'toolbar'
		container.appendChild(element)
		return element
	}
})

function rect(x: number, y: number, width: number, height: number): DOMRect {
	return {
		bottom: y + height,
		height,
		left: x,
		right: x + width,
		toJSON: () => ({}),
		top: y,
		width,
		x,
		y
	} as DOMRect
}
