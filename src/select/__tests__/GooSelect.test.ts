import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooSelect from '../GooSelect.svelte'
import { GooSelect as ExportedGooSelect } from '../index.js'
import type { GooSelectElement } from '../types.js'

describe('GooSelect', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
	})

	it('exports the native Svelte component from the package subpath', () => {
		expect(ExportedGooSelect).toBe(GooSelect)
	})

	it('renders a native select surface without custom element tags', () => {
		const { container } = render(GooSelect, {
			props: {
				value: 'b',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})

		expect(container.querySelector('goo-select')).toBeNull()
		expect(container.querySelector('goo-option')).toBeNull()
		expect(container.querySelector('.goo-select')?.getAttribute('value')).toBe('b')
		expect(container.querySelector('.goo-select__trigger-label')?.textContent).toBe('B')
	})

	it('binds the native root API for imperative updates', async() => {
		let element: GooSelectElement | null = null
		render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				],
				get element() {
					return element
				},
				set element(value) {
					element = value
				}
			}
		})
		await tick()

		element?.setValue('b')
		await tick()

		expect(element?.getValue()).toBe('b')
		expect(element?.querySelector('.goo-select__trigger-label')?.textContent).toBe('B')
	})

	it('emits Svelte callbacks with selected values', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				],
				onchange
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		element.setValue('b')
		await tick()

		expect(onchange).toHaveBeenCalledOnce()
		expect(onchange.mock.calls[0]?.[0]).toBe('b')
	})

	it('does not emit when setting the current value again', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				],
				onchange
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		element.setValue('a')
		await tick()

		expect(onchange).not.toHaveBeenCalled()
	})

	it('opens a popout from the Svelte root API', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		expect(document.querySelector('.goo-popout.goo-select-popout')).not.toBeNull()
		expect(document.querySelectorAll('.goo-select__option').length).toBe(2)
	})

	it('opens header selects below the trigger without a popout arrow by default', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!
		const trigger = container.querySelector<HTMLElement>('.goo-select__trigger')!

		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === document.documentElement) return rect(0, 0, 400, 300)
			if (this === trigger) return rect(40, 20, 100, 30)
			if (this.classList.contains('goo-popout')) return rect(0, 0, 80, 40)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			expect(element.open({
				autoFocus: false,
				keepWithin: { $element: document.documentElement, margin: 0 }
			})).toBe(true)
			await nextAnimationFrame()
			await nextAnimationFrame()

			const popout = document.querySelector<HTMLElement>('.goo-popout.goo-select-popout')!
			expect(popout.querySelector('.goo-popout__arrow')).toBeNull()
			expect(Number.parseFloat(popout.style.left)).toBe(40)
			expect(Number.parseFloat(popout.style.top)).toBe(54)
		} finally {
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('supports attached content-width menus', async() => {
		const { container } = render(GooSelect, {
			props: {
				menu: {
					placement: 'bottom-start',
					variant: 'attached',
					width: 'content'
				},
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'Longer option label' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const popout = document.querySelector<HTMLElement>('.goo-popout.goo-select-popout')!
		expect(element.classList.contains('goo-select--menu-attached')).toBe(true)
		expect(popout.classList.contains('goo-select-popout--menu-attached')).toBe(true)
		expect(popout.querySelector('.goo-select__options--width-content')).not.toBeNull()
	})

	it('sizes trigger-width menus from the trigger box', async() => {
		const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!
		const trigger = container.querySelector<HTMLElement>('.goo-select__trigger')!

		HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
			if (this === trigger) return rect(0, 0, 248, 30)
			return originalGetBoundingClientRect.call(this)
		}

		try {
			expect(element.open({ autoFocus: false })).toBe(true)
			await tick()

			const options = document.querySelector<HTMLElement>('.goo-select__options')!
			expect(options.style.width).toBe('248px')
			expect(options.style.minWidth).toBe('248px')
		} finally {
			HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
		}
	})

	it('handles option ids that are not valid CSS selector fragments', async() => {
		const specialId = 'quote"]bracket'
		const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
		const { container } = render(GooSelect, {
			props: {
				value: 'plain',
				options: [
					{ id: specialId, label: 'Special' },
					{ id: 'plain', label: 'Plain' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		HTMLElement.prototype.scrollIntoView = vi.fn()
		try {
			expect(element.open({ autoFocus: false })).toBe(true)
			await tick()

			expect(() => element.setValue(specialId)).not.toThrow()
			await tick()
			expect(element.hovered).toBe(specialId)

			expect(() => element._selectOption(element._selectOptions[0]!)).not.toThrow()
			await delay(300)
			expect(element.getValue()).toBe(specialId)
		} finally {
			HTMLElement.prototype.scrollIntoView = originalScrollIntoView
		}
	})

	it('renders submenu arrows as inline SVG instead of icon-font glyphs', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: '',
				options: [
					{
						id: 'more',
						label: 'More',
						type: 'submenu',
						options: [
							{ id: 'child', label: 'Child' }
						]
					}
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const arrow = document.querySelector<HTMLElement>('.goo-select__submenu-arrow')!
		expect(arrow.querySelector('svg')).not.toBeNull()
		expect(arrow.textContent).toBe('')
	})

	it('reuses the submenu popout when moving between submenu options', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: '',
				options: [
					{
						id: 'order',
						label: 'Order',
						type: 'submenu',
						options: [
							{ id: 'front', label: 'Bring to Front' }
						]
					},
					{
						id: 'transform',
						label: 'Transform',
						type: 'submenu',
						options: [
							{ id: 'rotate', label: 'Rotate' }
						]
					}
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const orderOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="order"]')!
		const transformOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="transform"]')!
		orderOption.scrollIntoView = vi.fn()
		transformOption.scrollIntoView = vi.fn()

		orderOption.dispatchEvent(new MouseEvent('mouseenter'))
		await delay(320)

		const firstPopout = document.querySelector<HTMLElement>('.goo-popout.goo-select-submenu-popout')!
		expect(firstPopout).not.toBeNull()
		expect(firstPopout.querySelector('.goo-select__submenu-frame')).not.toBeNull()
		expect(firstPopout.querySelector('.goo-select__submenu-viewport')).not.toBeNull()
		expect(firstPopout.textContent).toContain('Bring to Front')

		transformOption.dispatchEvent(new MouseEvent('mouseenter'))
		await nextAnimationFrame()

		const frame = firstPopout.querySelector<HTMLElement>('.goo-select__submenu-frame')!
		expect(frame.classList.contains('goo-select__submenu-frame--morph')).toBe(true)
		expect(firstPopout.querySelectorAll('.goo-select__submenu')).toHaveLength(2)
		await delay(360)

		const popouts = document.querySelectorAll<HTMLElement>('.goo-popout.goo-select-submenu-popout')
		expect(popouts).toHaveLength(1)
		expect(popouts[0]).toBe(firstPopout)
		expect(popouts[0].textContent).toContain('Rotate')
		expect(popouts[0].textContent).not.toContain('Bring to Front')
	})

	it('settles rapid submenu switches on the latest submenu', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: '',
				options: [
					{
						id: 'order',
						label: 'Order',
						type: 'submenu',
						options: [
							{ id: 'front', label: 'Bring to Front' }
						]
					},
					{
						id: 'transform',
						label: 'Transform',
						type: 'submenu',
						options: [
							{ id: 'rotate', label: 'Rotate' }
						]
					},
					{
						id: 'export',
						label: 'Export',
						type: 'submenu',
						options: [
							{ id: 'png', label: 'PNG' }
						]
					}
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const orderOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="order"]')!
		const transformOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="transform"]')!
		const exportOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="export"]')!
		orderOption.scrollIntoView = vi.fn()
		transformOption.scrollIntoView = vi.fn()
		exportOption.scrollIntoView = vi.fn()

		orderOption.dispatchEvent(new MouseEvent('mouseenter'))
		await delay(320)
		transformOption.dispatchEvent(new MouseEvent('mouseenter'))
		await nextAnimationFrame()
		exportOption.dispatchEvent(new MouseEvent('mouseenter'))
		await delay(320)

		const popouts = document.querySelectorAll<HTMLElement>('.goo-popout.goo-select-submenu-popout')
		expect(popouts).toHaveLength(1)
		expect(popouts[0].querySelectorAll('.goo-select__submenu')).toHaveLength(1)
		expect(popouts[0].textContent).toContain('PNG')
		expect(popouts[0].textContent).not.toContain('Bring to Front')
		expect(popouts[0].textContent).not.toContain('Rotate')
	})

	it('selects the option under the pointer when dragging from the trigger', async() => {
		const originalElementFromPoint = document.elementFromPoint
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!
		const trigger = container.querySelector<HTMLElement>('.goo-select__trigger')!

		try {
			trigger.dispatchEvent(pointerEvent('pointerdown', { pointerId: 3, clientX: 20, clientY: 20 }))
			await tick()

			const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
			option.scrollIntoView = vi.fn()
			document.elementFromPoint = vi.fn(() => option)
			document.dispatchEvent(pointerEvent('pointermove', { pointerId: 3, clientX: 20, clientY: 48 }))
			document.dispatchEvent(pointerEvent('pointerup', { pointerId: 3, clientX: 20, clientY: 48 }))
			await tick()

			expect(option.classList.contains('goo-select__option--hovered')).toBe(true)
			expect(element.getValue()).toBe('b')
		} finally {
			document.elementFromPoint = originalElementFromPoint
		}
	})

	it('selects already-open menu options on pointer release', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
		option.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4 }))
		await tick()
		expect(element.getValue()).toBe('a')

		option.dispatchEvent(pointerEvent('pointerup', { pointerId: 4 }))
		await tick()
		expect(element.getValue()).toBe('b')
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

function nextAnimationFrame(): Promise<void> {
	return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function pointerEvent(
	type: string,
	options: { pointerId?: number; clientX?: number; clientY?: number } = {}
): PointerEvent {
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		button: 0,
		clientX: options.clientX ?? 0,
		clientY: options.clientY ?? 0
	})
	Object.defineProperty(event, 'pointerId', { value: options.pointerId ?? 1 })
	return event as PointerEvent
}
