import { afterEach, describe, expect, it, vi } from 'vitest'

import { createGooDialog, GooConfirm } from '../index.ts'

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))

describe('GooDialog', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-dialog, .goo-dialog-backdrop').forEach(element => element.remove())
		vi.useRealTimers()
	})

	it('opens native dialog elements without custom tags', async() => {
		const dialog = createGooDialog({
			type: 'alert',
			content: 'Hello'
		})

		const resultPromise = dialog.open()
		await nextFrame()

		expect(document.querySelector('goo-dialog')).toBeNull()
		expect(document.querySelector('.goo-dialog[open]')).not.toBeNull()
		expect(dialog.isOpen).toBe(true)

		await dialog.close()
		await expect(resultPromise).resolves.toEqual({ cancel: true })
	})

	it('resolves confirm dialogs from footer actions', async() => {
		const resultPromise = GooConfirm('Continue?')
		await nextFrame()
		const dialog = document.querySelector<HTMLElement>('.goo-dialog[open]')

		expect(dialog).not.toBeNull()
		dialog?.querySelector<HTMLElement>('.goo-dialog__ok-btn')?.click()

		await expect(resultPromise).resolves.toMatchObject({ ok: true })
	})

	it('treats string content as text instead of HTML', async() => {
		const dialog = createGooDialog({
			type: 'alert',
			content: '<img src=x onerror=alert(1)>'
		})

		const resultPromise = dialog.open()
		await nextFrame()

		const content = document.querySelector<HTMLElement>('.goo-dialog__content')
		expect(content?.textContent).toBe('<img src=x onerror=alert(1)>')
		expect(content?.querySelector('img')).toBeNull()

		await dialog.close()
		await expect(resultPromise).resolves.toEqual({ cancel: true })
	})

	it('treats updated string content as text instead of HTML', () => {
		const dialog = createGooDialog({
			type: 'alert',
			content: 'Initial'
		})

		dialog.setContent('<button onclick=alert(1)>Run</button>')

		expect(dialog.$content?.textContent).toBe('<button onclick=alert(1)>Run</button>')
		expect(dialog.$content?.querySelector('button')).toBeNull()
	})
})
