import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPanel } from '../_createPanel.js'

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
		expect(panel.$header).toBeNull()
		expect(panel.$title).toBeNull()
		expect(panel.querySelector('.goo-panel__header')).toBeNull()
	})
})
