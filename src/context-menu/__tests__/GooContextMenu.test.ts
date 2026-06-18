import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createGooContextMenu } from '../GooContextMenu.ts'
import { GooContextMenu } from '../managed-context-menu.ts'

describe('createGooContextMenu', () => {
	afterEach(() => {
		GooContextMenu.get('unsafe-menu')?.destroy()
		GooContextMenu.get('managed-destroy')?.destroy()
		GooContextMenu.get('replace-menu')?.destroy()
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
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

		expect(menu.open({ at: { x: 10, y: 10 }, autoFocus: false })).toBe(true)
		await Promise.resolve()

		const popout = document.querySelector('.goo-popout.goo-context-menu-popout')
		expect(popout?.classList.contains('sketch-contextmenu')).toBe(true)
		expect(popout?.classList.contains('sketch-CancelDestroy')).toBe(true)
		expect(popout?.querySelector('.goo-select__submenu-arrow svg')).toBeInstanceOf(SVGElement)
	})

	it('renders managed string labels as text instead of HTML', async() => {
		const menu = GooContextMenu.register('unsafe-menu', [
			{
				id: 'unsafe',
				label: '<img src=x onerror=alert(1)>'
			}
		])
		await tick()

		expect(menu.open({ at: { x: 10, y: 10 }, autoFocus: false })).toBe(true)
		await Promise.resolve()

		const label = document.querySelector('.goo-context-menu-popout .goo-select__label')
		expect(label?.textContent).toBe('<img src=x onerror=alert(1)>')
		expect(label?.querySelector('img')).toBeNull()
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
		expect(menu.open({ at: { x: 10, y: 10 }, autoFocus: false })).toBe(false)

		menu.element.dispatchEvent(new CustomEvent('open'))
		expect(onOpen).not.toHaveBeenCalled()
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
		expect(firstMenu.open({ at: { x: 10, y: 10 }, autoFocus: false })).toBe(false)
	})
})
