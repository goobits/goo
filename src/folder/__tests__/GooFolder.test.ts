import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFolder } from '../_createFolder.ts'

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

	it('toggles open state when clicking the header', () => {
		const folder = createFolder({ title: 'Settings', open: true })
		document.body.appendChild(folder)

		expect(folder.open).toBe(true)
		expect(folder.headerElement?.getAttribute('aria-expanded')).toBe('true')

		folder.headerElement?.click()
		expect(folder.open).toBe(false)
		expect(folder.headerElement?.getAttribute('aria-expanded')).toBe('false')

		folder.headerElement?.click()
		expect(folder.open).toBe(true)
		expect(folder.headerElement?.getAttribute('aria-expanded')).toBe('true')
	})

	it('treats string content as text instead of HTML', () => {
		const folder = createFolder({
			title: 'Settings',
			content: '<img src=x onerror=alert(1)>'
		})
		document.body.appendChild(folder)

		expect(folder.contentElement?.textContent).toBe('<img src=x onerror=alert(1)>')
		expect(folder.contentElement?.querySelector('img')).toBeNull()
	})

	it('keeps header actions separate from the collapse button', () => {
		const action = document.createElement('button')
		action.type = 'button'
		action.textContent = 'Reset'
		const onAction = vi.fn()
		action.addEventListener('click', onAction)
		const folder = createFolder({
			title: 'Effects',
			open: true,
			headerActions: action
		})
		document.body.appendChild(folder)

		action.click()

		expect(onAction).toHaveBeenCalledOnce()
		expect(folder.open).toBe(true)
		expect(folder.headerActionsElement?.contains(action)).toBe(true)
		expect(folder.headerElement?.contains(action)).toBe(false)
	})

	it('destroys a programmatically mounted folder', () => {
		const folder = createFolder({ title: 'Temporary' })
		document.body.appendChild(folder)

		folder.destroy()

		expect(document.body.contains(folder)).toBe(false)
	})
})
