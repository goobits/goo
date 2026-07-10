import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { gooTooltipRuntime } from '../../tooltip/index.ts'
import { createGooContextMenu } from '../GooContextMenu.ts'
import { GooContextMenu } from '../managed-context-menu.ts'

describe('createGooContextMenu', () => {
	afterEach(() => {
		GooContextMenu.get('unsafe-menu')?.destroy()
		GooContextMenu.get('managed-destroy')?.destroy()
		GooContextMenu.get('managed-set-value')?.destroy()
		GooContextMenu.get('replace-menu')?.destroy()
		GooContextMenu.get('reposition-menu')?.destroy()
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		vi.restoreAllMocks()
	})

	it('applies context-menu classes to the visible popout', async() => {
		const menu = createGooContextMenu({
			className: 'sketch-contextmenu sketch-CancelDestroy',
			options: [
				{
					id: 'order',
					label: 'Order',
					type: 'submenu',
					options: [
						{ id: 'front', label: 'Bring to Front' }
					]
				}
			]
		})
		await tick()

		expect(menu.open({ at: { x: 10, y: 10 } })).toBe(true)
		await Promise.resolve()

		const popout = document.querySelector('.goo-popout.goo-context-menu-popout')
		expect(popout?.classList.contains('goo-menu-popout')).toBe(true)
		expect(popout?.classList.contains('sketch-contextmenu')).toBe(true)
		expect(popout?.classList.contains('sketch-CancelDestroy')).toBe(true)
		expect(popout?.querySelector('.goo-select__options')?.getAttribute('role')).toBe('menu')
		expect(popout?.querySelector('.goo-select__option')?.getAttribute('role')).toBe('menuitem')
		expect(popout?.querySelector('.goo-select__option')?.hasAttribute('aria-selected')).toBe(false)
		expect(popout?.querySelector('.goo-select__submenu-arrow svg')).toBeInstanceOf(SVGElement)

		const submenuOption = popout?.querySelector<HTMLElement>('.goo-select__option[data-id="order"]')
		if (submenuOption) submenuOption.scrollIntoView = vi.fn()
		submenuOption?.dispatchEvent(new MouseEvent('pointerup', { button: 0 }))
		await Promise.resolve()

		const submenu = document.querySelector('.goo-popout.goo-select-submenu-popout')
		expect(submenu?.classList.contains('goo-menu-popout')).toBe(true)
		expect(submenu?.querySelector('.goo-select__submenu')?.getAttribute('role')).toBe('menu')
		expect(submenu?.querySelector('.goo-select__option')?.getAttribute('role')).toBe('menuitem')
	})

	it('renders managed string labels as text instead of HTML', async() => {
		const menu = GooContextMenu.register('unsafe-menu', [
			{
				id: 'unsafe',
				label: '<img src=x onerror=alert(1)>'
			}
		])
		await tick()

		expect(menu.open({ at: { x: 10, y: 10 } })).toBe(true)
		await Promise.resolve()

		const label = document.querySelector('.goo-context-menu-popout .goo-select__label')
		expect(label?.textContent).toBe('<img src=x onerror=alert(1)>')
		expect(label?.querySelector('img')).toBeNull()
	})

	it('focuses the menu panel when imperatively opened with autofocus', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
		const focus = vi.spyOn(HTMLElement.prototype, 'focus')
		HTMLElement.prototype.scrollIntoView = vi.fn()
		document.body.append(menu)
		await tick()

		try {
			expect(menu.open({ x: 20, y: 20, autoFocus: true, initialFocus: 'content' })).toBe(true)
			await Promise.resolve()
			await delay(550)

			const panel = document.querySelector<HTMLElement>('.goo-context-menu-popout .goo-select__options')
			expect(panel).not.toBeNull()
			expect(focus.mock.contexts).toContain(panel)
		} finally {
			await menu.destroy()
			HTMLElement.prototype.scrollIntoView = originalScrollIntoView
		}
	})

	it('keeps an imperatively anchored menu open on anchor pointerdown', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const anchor = document.createElement('button')
		document.body.append(menu, anchor)
		await tick()

		expect(menu.open({ at: anchor, initialFocus: 'none' })).toBe(true)
		await Promise.resolve()
		expect(document.querySelector('.goo-popout.goo-context-menu-popout')).not.toBeNull()

		anchor.dispatchEvent(new PointerEvent('pointerdown', {
			bubbles: true,
			cancelable: true
		}))
		expect(document.querySelector('.goo-popout.goo-context-menu-popout')).not.toBeNull()

		await menu.destroy()
		anchor.remove()
	})

	it('repositions the current managed menu when reopened with a new anchor', async() => {
		vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
			bottom: 1000,
			height: 1000,
			left: 0,
			right: 1000,
			toJSON: () => ({}),
			top: 0,
			width: 1000,
			x: 0,
			y: 0
		})
		const menu = GooContextMenu.register('reposition-menu', [
			{ id: 'delete', label: 'Delete' }
		])
		await tick()

		GooContextMenu.open(menu, { at: { x: 20, y: 30 } })
		await Promise.resolve()
		const popout = document.querySelector<HTMLElement>('.goo-popout.goo-context-menu-popout')
		expect(popout).not.toBeNull()
		const firstLeft = Number.parseFloat(popout?.style.left ?? '')
		const firstTop = Number.parseFloat(popout?.style.top ?? '')

		GooContextMenu.open(menu, { at: { x: 120, y: 130 } })
		await new Promise(requestAnimationFrame)

		expect(Number.parseFloat(popout?.style.left ?? '')).not.toBe(firstLeft)
		expect(Number.parseFloat(popout?.style.top ?? '')).not.toBe(firstTop)
	})

	it('honors explicit point alignment and hides active tooltips before opening', async() => {
		const hideTooltip = vi.spyOn(gooTooltipRuntime, 'hide')
		vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
			bottom: 1000,
			height: 1000,
			left: 0,
			right: 1000,
			toJSON: () => ({}),
			top: 0,
			width: 1000,
			x: 0,
			y: 0
		})
		const menu = createGooContextMenu({
			options: [
				{ id: 'delete', label: 'Delete' }
			]
		})
		await tick()

		expect(menu.open({
			at: {
				align: 'right top to left top',
				offset: { x: 12, y: 0 },
				point: { x: 100, y: 80 }
			}
		})).toBe(true)
		await Promise.resolve()

		const popout = document.querySelector<HTMLElement>('.goo-popout.goo-context-menu-popout')
		expect(hideTooltip).toHaveBeenCalledOnce()
		expect(Number.parseFloat(popout?.style.left ?? '')).toBeLessThan(100)
		expect(Number.parseFloat(popout?.style.top ?? '')).toBe(80)
	})

	it('opens point menus flush at the cursor with no arrow by default', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		await tick()

		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.body) return rect(0, 0, 300, 200)
			if (this.classList.contains('goo-popout')) return rect(0, 0, 120, 40)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			expect(menu.open({ x: 100, y: 80 })).toBe(true)
			await Promise.resolve()

			const popout = document.querySelector<HTMLElement>('.goo-popout.goo-context-menu-popout')

			expect(Number.parseFloat(popout?.style.left ?? '')).toBe(100)
			expect(Number.parseFloat(popout?.style.top ?? '')).toBe(80)
			expect(popout?.querySelector('.goo-popout__arrow')).toBeNull()
			expect(menu.getHoveredOptionId()).toBeNull()
			expect(document.querySelector('.goo-select__option--hovered')).toBeNull()
		} finally {
			await menu.destroy()
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('toggles closed when reopened from the same element anchor', async() => {
		const anchor = document.createElement('button')
		const otherAnchor = document.createElement('button')
		document.body.append(anchor, otherAnchor)
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		await tick()

		expect(menu.open({ at: anchor })).toBe(true)
		await Promise.resolve()
		expect(menu.isOpen()).toBe(true)

		// Same anchor: toggle closed without wiring anything in the owner.
		expect(menu.open({ at: anchor })).toBe(false)
		expect(menu.isOpen()).toBe(false)

		// A different anchor while open repositions instead of closing.
		expect(menu.open({ at: anchor })).toBe(true)
		await Promise.resolve()
		expect(menu.open({ at: otherAnchor })).toBe(true)
		expect(menu.isOpen()).toBe(true)

		await menu.destroy()
		anchor.remove()
		otherAnchor.remove()
	})

	it('suppresses the browser context menu over the open menu popout', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		await tick()

		expect(menu.open({ x: 40, y: 40 })).toBe(true)
		await Promise.resolve()
		expect(menu.isOpen()).toBe(true)

		const option = document.querySelector<HTMLElement>('.goo-popout .goo-select__option')
		expect(option).not.toBeNull()
		const rightClick = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
		option?.dispatchEvent(rightClick)

		expect(rightClick.defaultPrevented).toBe(true)
		expect(menu.isOpen()).toBe(true)

		await menu.destroy()
	})

	it('closes when the page loses focus', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		await tick()

		expect(menu.open({ x: 20, y: 20 })).toBe(true)
		await Promise.resolve()

		window.dispatchEvent(new Event('blur'))

		expect(menu.isOpen()).toBe(false)

		await menu.destroy()
	})

	it('closes on an immediate outside pointerdown after opening', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const outside = document.createElement('button')
		document.body.append(menu, outside)
		await tick()

		expect(menu.open({ x: 20, y: 20, initialFocus: 'none' })).toBe(true)
		await Promise.resolve()

		outside.dispatchEvent(new PointerEvent('pointerdown', {
			bubbles: true,
			cancelable: true
		}))

		expect(menu.isOpen()).toBe(false)

		await menu.destroy()
		outside.remove()
	})

	it('closes on Escape when the popout does not own focus', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const host = document.createElement('div')
		host.tabIndex = 0
		document.body.append(menu, host)
		host.focus()
		await tick()

		expect(menu.open({ x: 20, y: 20, initialFocus: 'none' })).toBe(true)
		await Promise.resolve()

		const escape = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'Escape'
		})
		document.dispatchEvent(escape)

		expect(escape.defaultPrevented).toBe(true)
		expect(menu.isOpen()).toBe(false)

		await menu.destroy()
		host.remove()
	})

	it('closes an open menu on an attached contextmenu event', async() => {
		const onclose = vi.fn()
		const menu = createGooContextMenu({
			onclose,
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const host = document.createElement('div')
		document.body.append(menu, host)
		const detach = menu.attachTo(host)
		await tick()

		expect(menu.open({ x: 20, y: 20 })).toBe(true)
		await Promise.resolve()
		expect(document.querySelector('.goo-popout.goo-context-menu-popout')).not.toBeNull()
		expect(onclose).not.toHaveBeenCalled()

		host.dispatchEvent(new MouseEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
			button: 2,
			clientX: 24,
			clientY: 24
		}))
		host.dispatchEvent(new MouseEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			clientX: 24,
			clientY: 24
		}))
		await Promise.resolve()
		expect(onclose).toHaveBeenCalledOnce()

		detach()
		await menu.destroy()
		host.remove()
	})

	it('focuses an attached contextmenu owner', async() => {
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const input = document.createElement('input')
		const host = document.createElement('div')
		host.tabIndex = 0
		document.body.append(input, menu, host)
		const detach = menu.attachTo(host)
		input.focus()
		await tick()

		host.dispatchEvent(new MouseEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
			button: 2,
			clientX: 24,
			clientY: 24
		}))
		host.dispatchEvent(new MouseEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			clientX: 24,
			clientY: 24
		}))
		await Promise.resolve()

		expect(document.activeElement).toBe(host)

		detach()
		await menu.destroy()
		host.remove()
		input.remove()
	})

	it('opens an attached keyboard context menu with menu focus and keyboard selection', async() => {
		const onChoose = vi.fn()
		const menu = createGooContextMenu({
			options: [
				{ id: 'copy', label: 'Copy' },
				{ id: 'paste', label: 'Paste', onChoose }
			]
		})
		const host = document.createElement('button')
		const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
		const focus = vi.spyOn(HTMLElement.prototype, 'focus')
		HTMLElement.prototype.scrollIntoView = vi.fn()
		document.body.append(menu, host)
		const detach = menu.attachTo(host)
		host.focus()
		await tick()

		try {
			host.dispatchEvent(new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: 0,
				clientY: 0
			}))
			await Promise.resolve()
			await tick()
			await delay(550)

			const panel = document.querySelector<HTMLElement>('.goo-context-menu-popout .goo-select__options')
			expect(panel).not.toBeNull()
			expect(focus.mock.contexts).toContain(panel)
			const laterKeydown = vi.fn()
			panel?.addEventListener('keydown', laterKeydown)
			const copyOption = panel?.querySelector<HTMLElement>('.goo-select__option[data-id="copy"]')
			expect(copyOption?.classList.contains('goo-select__option--hovered')).toBe(true)

			const arrowDown = new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'ArrowDown'
			})
			panel?.dispatchEvent(arrowDown)
			expect(arrowDown.defaultPrevented).toBe(true)
			expect(laterKeydown).not.toHaveBeenCalled()
			const pasteOption = panel?.querySelector<HTMLElement>('.goo-select__option[data-id="paste"]')
			expect(pasteOption?.classList.contains('goo-select__option--hovered')).toBe(true)
			expect(panel?.hasAttribute('aria-activedescendant')).toBe(true)

			panel?.dispatchEvent(new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Enter'
			}))
			await delay(250)

			expect(onChoose).toHaveBeenCalledWith('paste')
		} finally {
			detach()
			await menu.destroy()
			host.remove()
			HTMLElement.prototype.scrollIntoView = originalScrollIntoView
		}
	})

	it('does not suppress a later contextmenu after a close-only right click expires', async() => {
		const onopen = vi.fn()
		const menu = createGooContextMenu({
			onopen,
			options: [
				{ id: 'copy', label: 'Copy' }
			]
		})
		const host = document.createElement('div')
		document.body.append(menu, host)
		const detach = menu.attachTo(host)
		await tick()

		expect(menu.open({ x: 20, y: 20 })).toBe(true)
		await Promise.resolve()
		expect(onopen).toHaveBeenCalledOnce()

		host.dispatchEvent(new MouseEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
			button: 2,
			clientX: 24,
			clientY: 24
		}))
		await delay(550)

		host.dispatchEvent(new MouseEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			clientX: 32,
			clientY: 32
		}))
		await Promise.resolve()

		expect(onopen).toHaveBeenCalledTimes(2)

		detach()
		await menu.destroy()
		host.remove()
	})

	it('detaches owned contextmenu listeners when destroyed', () => {
		const menu = createGooContextMenu()
		const host = document.createElement('div')
		const removeEventListener = vi.spyOn(host, 'removeEventListener')
		const cleanup = menu.attachTo(host)

		menu.destroy()
		cleanup()

		expect(removeEventListener).toHaveBeenCalledOnce()
		expect(removeEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function))
	})

	it('destroys managed menu listeners and unregisters the handle', () => {
		const menu = GooContextMenu.register('managed-destroy', [
			{ id: 'delete', label: 'Delete' }
		])
		const removeEventListener = vi.spyOn(menu.element, 'removeEventListener')
		const onOpen = vi.fn()

		menu.on('open', onOpen)
		menu.destroy()

		expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function), undefined)
		expect(removeEventListener).toHaveBeenCalledWith('open', expect.any(Function), undefined)
		expect(removeEventListener).toHaveBeenCalledWith('close', expect.any(Function), undefined)
		expect(GooContextMenu.get('managed-destroy')).toBeUndefined()
		expect(menu.open({ at: { x: 10, y: 10 } })).toBe(false)

		menu.element.dispatchEvent(new CustomEvent('open'))
		expect(onOpen).not.toHaveBeenCalled()
	})

	it('binds managed setValue actions to the menu handle', () => {
		let actionContext: unknown
		const action = vi.fn(function(this: unknown) {
			actionContext = this
		})
		const menu = GooContextMenu.register('managed-set-value', [
			{ id: 'copy', label: 'Copy', onChoose: action }
		])

		menu.setValue('copy')

		expect(action).toHaveBeenCalledWith('copy')
		expect(actionContext).toBe(menu)
	})

	it('destroys an existing managed menu before replacing its id', () => {
		const firstMenu = GooContextMenu.register('replace-menu', [
			{ id: 'first', label: 'First' }
		])
		const removeEventListener = vi.spyOn(firstMenu.element, 'removeEventListener')

		const secondMenu = GooContextMenu.register('replace-menu', [
			{ id: 'second', label: 'Second' }
		])

		expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function), undefined)
		expect(GooContextMenu.get('replace-menu')).toBe(secondMenu)
		expect(firstMenu.open({ at: { x: 10, y: 10 } })).toBe(false)
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

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
