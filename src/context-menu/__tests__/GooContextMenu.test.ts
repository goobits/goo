import { tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createGooContextMenu } from '../GooContextMenu.ts'

describe('createGooContextMenu', () => {
	afterEach(() => {
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
})
