import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFolder } from '../_createFolder.js'

describe('GooFolder', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-folder').forEach(element => element.remove())
	})

	it('creates native folder elements without custom tags', () => {
		const folder = createFolder({ title: 'Settings', open: true })
		document.body.appendChild(folder)

		expect(document.querySelector('goo-folder')).toBeNull()
		expect(document.querySelector('.goo-folder[title="Settings"]')).toBe(folder)
		expect(folder.open).toBe(true)

		folder.toggle()
		expect(folder.open).toBe(false)
		expect(folder.classList.contains('goo-folder--open')).toBe(false)
	})

	it('does not emit when setting the current open state again', () => {
		const folder = createFolder({ title: 'Settings', open: true })
		const onchange = vi.fn()
		document.body.appendChild(folder)
		folder.addEventListener('change', onchange)

		folder.setOpen(true)

		expect(onchange).not.toHaveBeenCalled()
	})
})
