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

	it('renders one close control for simple alerts', () => {
		const dialog = createGooDialog({
			type: 'alert',
			content: 'Hello'
		})

		expect(dialog.element.querySelector('.goo-dialog__close')).toBeNull()
		expect(dialog.element.querySelectorAll('.goo-dialog__close-badge')).toHaveLength(1)
	})

	it('resolves confirm dialogs from footer actions', async() => {
		const resultPromise = GooConfirm('Continue?').result
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

		const content = dialog.element.querySelector<HTMLElement>('.goo-dialog__content')
		expect(content?.textContent).toBe('<button onclick=alert(1)>Run</button>')
		expect(content?.querySelector('button')).toBeNull()
	})

	it('does not use rich DOM content as the dialog accessible name', () => {
		const content = document.createElement('section')
		content.innerHTML = '<h2>Keyboard shortcuts</h2><p>Lots of body copy</p>'
		const dialog = createGooDialog({
			type: 'overlay',
			ariaLabel: 'Open document',
			content,
			showClose: false
		})

		expect(dialog.element.getAttribute('aria-label')).toBe('Open document')
		expect(dialog.element.getAttribute('aria-labelledby')).toBeNull()
	})

	it('tears down owned element listeners when destroyed', async() => {
		const dialog = createGooDialog({
			type: 'alert',
			content: 'Hello'
		})
		const closeBadge = dialog.element.querySelector<HTMLElement>('.goo-dialog__close-badge')!
		const removeEventListenerSpy = vi.spyOn(closeBadge, 'removeEventListener')

		await dialog.destroy()

		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined)
	})

	it('cancels pending open frames when destroyed during opening', async() => {
		const cancelAnimationFrameSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
		const dialog = createGooDialog({
			type: 'alert',
			content: 'Hello'
		})
		const resultPromise = dialog.open()

		await dialog.destroy()

		expect(cancelAnimationFrameSpy).toHaveBeenCalled()
		await expect(resultPromise).resolves.toEqual({ cancel: true })
	})

	it('does not finish async verification after closing', async() => {
		let resolveVerify: ((value: boolean) => void) | undefined
		const onOk = vi.fn()
		const dialog = createGooDialog({
			type: 'prompt',
			content: 'Name?',
			fields: [ { type: 'text', name: 'name' } ],
			onOk,
			verify: () => new Promise<boolean>(resolve => {
				resolveVerify = resolve
			})
		})
		const resultPromise = dialog.open()
		await nextFrame()

		dialog.element.querySelector<HTMLElement>('.goo-dialog__ok-btn')?.click()
		await dialog.close()
		resolveVerify?.(true)
		await Promise.resolve()

		expect(onOk).not.toHaveBeenCalled()
		await expect(resultPromise).resolves.toEqual({ cancel: true })
	})

	it('contains Escape on the topmost dialog', async() => {
		const dialog = createGooDialog({
			type: 'alert',
			content: 'Hello'
		})
		const onBodyKeydown = vi.fn()
		const resultPromise = dialog.open()
		await nextFrame()

		document.body.addEventListener('keydown', onBodyKeydown)
		try {
			const event = dispatchDialogKey(dialog.element, 'Escape')

			expect(event.defaultPrevented).toBe(true)
			expect(onBodyKeydown).not.toHaveBeenCalled()
			await expect(resultPromise).resolves.toEqual({ cancel: true })
		} finally {
			document.body.removeEventListener('keydown', onBodyKeydown)
		}
	})

	it('contains Enter when it submits the dialog', async() => {
		const dialog = createGooDialog({
			type: 'confirm',
			content: 'Continue?'
		})
		const onBodyKeydown = vi.fn()
		const resultPromise = dialog.open()
		await nextFrame()

		document.body.addEventListener('keydown', onBodyKeydown)
		try {
			const event = dispatchDialogKey(dialog.element, 'Enter')

			expect(event.defaultPrevented).toBe(true)
			expect(onBodyKeydown).not.toHaveBeenCalled()
			await expect(resultPromise).resolves.toMatchObject({ ok: true })
		} finally {
			document.body.removeEventListener('keydown', onBodyKeydown)
		}
	})
})

function dispatchDialogKey(element: HTMLElement, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key
	})
	element.dispatchEvent(event)
	return event
}
