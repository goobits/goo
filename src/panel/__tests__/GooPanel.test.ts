import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPanel } from '../_createPanel.ts'

describe('GooPanel', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-panel').forEach(element => element.remove())
	})

	it('creates native panel elements without custom tags', () => {
		const panel = createPanel({ title: 'Controls', open: true, autoPlace: false })
		document.body.appendChild(panel)

		expect(document.querySelector('goo-panel')).toBeNull()
		expect(document.querySelector('.goo-panel[title="Controls"]')).toBe(panel)
		expect(panel.open).toBe(true)

		panel.close()
		expect(panel.open).toBe(false)
		expect(panel.classList.contains('goo-panel--open')).toBe(false)
	})

	it('does not emit when setting the current open state again', () => {
		const panel = createPanel({ title: 'Controls', open: true, autoPlace: false })
		const onchange = vi.fn()
		document.body.appendChild(panel)
		panel.addEventListener('change', onchange)

		panel.setOpen(true)

		expect(onchange).not.toHaveBeenCalled()
	})

	it('can render without a header', () => {
		const panel = createPanel({ title: 'Controls', showHeader: false, autoPlace: false })
		document.body.appendChild(panel)

		expect(panel.classList.contains('goo-panel--headerless')).toBe(true)
		expect(panel.headerElement).toBeNull()
		expect(panel.titleElement).toBeNull()
		expect(panel.querySelector('.goo-panel__header')).toBeNull()
	})

	it('treats string content as text instead of HTML', () => {
		const panel = createPanel({
			title: 'Controls',
			content: '<img src=x onerror=alert(1)>',
			autoPlace: false
		})
		document.body.appendChild(panel)

		expect(panel.contentElement?.textContent).toBe('<img src=x onerror=alert(1)>')
		expect(panel.contentElement?.querySelector('img')).toBeNull()
	})

	it('detaches drag listeners when destroyed', () => {
		const panel = createPanel({ title: 'Controls', draggable: true, autoPlace: false })
		document.body.appendChild(panel)
		const header = panel.headerElement!
		const removeEventListenerSpy = vi.spyOn(header, 'removeEventListener')

		panel.destroy()

		expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
		expect(removeEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
		expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
		expect(removeEventListenerSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
	})
})
