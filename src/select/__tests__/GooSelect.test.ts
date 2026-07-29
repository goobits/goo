import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../__tests__/_pointerEvents.ts'
import { iconRegistry } from '../../icon/registry.ts'
import { gooTooltipRuntime } from '../../tooltip/index.ts'
import { DropdownPanel } from '../_dropdownPanel.ts'
import GooSelect from '../GooSelect.svelte'
import { createIcon } from '../selectDom.ts'
import type { GooSelectElement } from '../types.ts'
import SelectCustomTriggerHost from './SelectCustomTriggerHost.svelte'

describe('GooSelect', () => {
	afterEach(() => {
		vi.useRealTimers()
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
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
		expect(container.querySelector('.goo-select__trigger-arrow .lucide-chevron-down')).not.toBeNull()
	})

	it('renders app-owned custom trigger content without default chrome', () => {
		const { container } = render(SelectCustomTriggerHost)

		expect(container.querySelector('[data-testid="custom-trigger"]')).not.toBeNull()
		expect(container.querySelector('.goo-select__trigger-label')).toBeNull()
		expect(container.querySelector('.goo-select__trigger-arrow')).toBeNull()
	})

	it('preserves native form submission, required validation, and external label semantics', async() => {
		const { container } = render(GooSelect, {
			props: {
				id: 'genre',
				name: 'genre',
				placeholder: 'Choose a genre',
				required: true,
				value: '',
				options: [
					{ id: 'rock', label: 'Rock' },
					{ id: 'jazz', label: 'Jazz' }
				]
			}
		})
		const form = document.createElement('form')
		const label = document.createElement('label')
		label.htmlFor = 'genre'
		label.textContent = 'Genre'
		form.append(label, container.querySelector('.goo-select')!)
		document.body.append(form)

		const element = form.querySelector<GooSelectElement>('.goo-select')!
		const trigger = form.querySelector<HTMLButtonElement>('.goo-select__trigger')!
		const field = form.querySelector<HTMLSelectElement>('[data-goo-select-field]')!

		expect(trigger.id).toBe('genre')
		expect(label.control).toBe(trigger)
		expect(field.name).toBe('genre')
		expect(field.required).toBe(true)
		expect(field.options[0]?.textContent).toBe('Choose a genre')
		expect(form.checkValidity()).toBe(false)
		await Promise.resolve()
		expect(trigger.getAttribute('aria-invalid')).toBe('true')
		expect(document.activeElement).toBe(trigger)

		element.setValue('rock')
		await tick()

		expect(field.value).toBe('rock')
		expect(form.checkValidity()).toBe(true)
		expect(new FormData(form).get('genre')).toBe('rock')
		expect(trigger.hasAttribute('aria-invalid')).toBe(false)
	})

	it('omits disabled select values from native FormData', () => {
		const { container } = render(GooSelect, {
			props: {
				disabled: true,
				name: 'genre',
				value: 'rock',
				options: [ { id: 'rock', label: 'Rock' } ]
			}
		})
		const form = document.createElement('form')
		form.append(container.querySelector('.goo-select')!)

		expect(new FormData(form).has('genre')).toBe(false)
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

	it('omits optgroup headers when supported contents collapse to dividers only', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: '',
				options: [
					{
						type: 'optgroup',
						label: 'Path',
						options: [
							{ id: 'offset-path', label: 'Offset Path', isSupported: () => false },
							{ type: 'divider' },
							{ id: 'convert-outline', label: 'Convert Outline', isSupported: () => false }
						]
					},
					{
						type: 'optgroup',
						label: 'Edit',
						options: [
							{ id: 'copy', label: 'Copy' }
						]
					}
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const labels = Array.from(
			document.querySelectorAll<HTMLElement>('.goo-select__optgroup-label')
		).map(label => label.textContent)

		expect(labels).toEqual([ 'Edit' ])
		expect(document.querySelector('.goo-select__option[data-id="copy"]')).not.toBeNull()
		expect(document.querySelector('.goo-select__divider')).toBeNull()
	})

	it('appends open-time popout class names', async() => {
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

		expect(element.open({
			autoFocus: false,
			popoutClassName: 'sketch-contextual-menu-popout'
		})).toBe(true)
		await tick()

		expect(document.querySelector('.goo-popout.goo-select-popout.sketch-contextual-menu-popout')).not.toBeNull()
	})

	it('applies option row class names without treating labels as markup', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: '',
				options: [
					{ id: 'filter', label: '<b>Filter</b>', className: 'filter-row' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const option = document.querySelector('.goo-select__option.filter-row')
		expect(option).not.toBeNull()
		expect(option?.querySelector('.goo-select__label')?.textContent).toBe('<b>Filter</b>')
		expect(option?.querySelector('b')).toBeNull()
	})

	it('hides active tooltips before opening menu popouts', async() => {
		const hideTooltip = vi.spyOn(gooTooltipRuntime, 'hide')
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

		expect(hideTooltip).toHaveBeenCalledOnce()
	})

	it('emits typed hover changes with the active option', async() => {
		const onhoverchange = vi.fn()
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				],
				onhoverchange
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
			.dispatchEvent(new MouseEvent('mouseenter'))

		expect(onhoverchange).toHaveBeenCalledWith('b', {
			select: element,
			option: expect.objectContaining({ id: 'b', label: 'B' })
		})
	})

	it('renders native link options without changing the selected value', async() => {
		const onchange = vi.fn()
		const onChoose = vi.fn()
		const { container } = render(GooSelect, {
			props: {
				value: 'current',
				showSelectionIndicator: false,
				menu: {
					semantics: {
						containerRole: 'menu',
						optionRole: 'menuitem',
						popupRole: 'menu',
						usesSelectedState: false
					}
				},
				options: [
					{ id: 'current', label: 'Current' },
					{
						id: 'download',
						label: 'Download',
						href: '/export.json',
						target: '_blank',
						download: 'favorites.json',
						dataset: { testid: 'download-favorites' },
						onChoose
					}
				],
				onchange
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const link = document.querySelector<HTMLAnchorElement>(
			'.goo-select__option[data-id="download"]'
		)!
		link.addEventListener('click', event => event.preventDefault())

		expect(link.pathname).toBe('/export.json')
		expect(link.target).toBe('_blank')
		expect(link.rel).toBe('noopener noreferrer')
		expect(link.download).toBe('favorites.json')
		expect(link.dataset.testid).toBe('download-favorites')

		link.click()

		expect(onChoose).toHaveBeenCalledExactlyOnceWith('download')
		expect(element.getValue()).toBe('current')
		expect(onchange).not.toHaveBeenCalled()
	})

	it('does not render inline HTML icon strings', () => {
		const icon = createIcon(' <img src=x onerror=alert(1)>')

		expect(icon).toBeNull()
	})

	it('renders app-installed registry icons from pure-data option names', () => {
		iconRegistry.register(
			'select-shape-test',
			'<svg viewBox="0 0 16 16"><path d="M1 1h14v14H1z" /></svg>'
		)

		const icon = createIcon('select-shape-test')

		expect(icon?.classList.contains('goo-select__icon')).toBe(true)
		expect(icon?.querySelector('svg path')?.getAttribute('d')).toBe('M1 1h14v14H1z')
		expect(icon?.classList.contains('select-shape-test')).toBe(false)
	})

	it('shows a selected option indicator by default', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: 'b',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		expect(document.querySelector('.goo-select__options')?.getAttribute('role')).toBe('listbox')
		const selected = document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
		expect(selected.getAttribute('role')).toBe('option')
		expect(selected.getAttribute('aria-selected')).toBe('true')
		expect(selected.querySelector('.goo-select__check .lucide-check')).not.toBeNull()
	})

	it('marks destructive options with the danger modifier', async() => {
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'remove', label: 'Delete', tone: 'danger' }
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const danger = document.querySelector<HTMLElement>('.goo-select__option[data-id="remove"]')!
		expect(danger.classList.contains('goo-select__option--danger')).toBe(true)
		expect(document.querySelector<HTMLElement>('.goo-select__option[data-id="a"]')?.classList.contains('goo-select__option--danger')).toBe(false)
	})

	it('can hide the selection indicator without disabling option choice', async() => {
		const onchange = vi.fn()
		const { container } = render(GooSelect, {
			props: {
				value: 'a',
				showSelectionIndicator: false,
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B' }
				],
				onchange
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		expect(document.querySelector('.goo-select__check')).toBeNull()
		expect(document.querySelector<HTMLElement>('.goo-select__option[data-id="a"]')?.getAttribute('aria-selected')).toBe('false')

		const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
		option.dispatchEvent(pointerEvent('pointerdown', { pointerId: 8 }))
		option.dispatchEvent(pointerEvent('pointerup', { pointerId: 8 }))
		await delay(300)

		expect(element.getValue()).toBe('b')
		expect(onchange).toHaveBeenCalledOnce()
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
				keepWithin: { element: document.documentElement, margin: 0 }
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
			expect(element.getHoveredOptionId()).toBe(specialId)

			const option = Array.from(document.querySelectorAll<HTMLElement>('.goo-select__option'))
				.find(nextOption => nextOption.dataset.id === specialId)
			expect(option).not.toBeUndefined()
			option?.click()
			await delay(300)
			expect(element.getValue()).toBe(specialId)
		} finally {
			HTMLElement.prototype.scrollIntoView = originalScrollIntoView
		}
	})

	it('renders submenu arrows with Lucide instead of icon-font glyphs', async() => {
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
		expect(arrow.querySelector('.lucide-chevron-right')).not.toBeNull()
		expect(arrow.textContent).toBe('')
	})

	it('marks flipped LTR submenu rows so arrows point toward the opened side', async() => {
		const restoreRects = installSubmenuPlacementRects({ optionX: 260, optionWidth: 56, submenuWidth: 120 })
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

		try {
			expect(element.open({ autoFocus: false, keepWithin: { element: document.documentElement, margin: 0 } })).toBe(true)
			await tick()

			const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="more"]')!
			option.scrollIntoView = vi.fn()
			option.dispatchEvent(pointerEvent('pointerup'))
			await nextAnimationFrame()

			expect(option.dataset.submenuSide).toBe('left')
			expect(option.classList.contains('goo-select__option--submenu-open-left')).toBe(true)
			expect(document.querySelector('.goo-popout.goo-select-submenu-popout .goo-popout__arrow')?.classList.contains('right')).toBe(true)
		} finally {
			restoreRects()
		}
	})

	it('propagates local RTL direction into select and submenu popouts', async() => {
		const restoreRects = installSubmenuPlacementRects({ optionX: 160, optionWidth: 56, submenuWidth: 80 })
		const { container } = render(GooSelect, {
			props: {
				dir: 'rtl',
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

		try {
			expect(element.open({ autoFocus: false, keepWithin: { element: document.documentElement, margin: 0 } })).toBe(true)
			await tick()

			const popout = document.querySelector<HTMLElement>('.goo-popout.goo-select-popout')!
			expect(popout.getAttribute('dir')).toBe('rtl')

			const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="more"]')!
			option.scrollIntoView = vi.fn()
			option.dispatchEvent(pointerEvent('pointerup'))
			await nextAnimationFrame()

			const submenu = document.querySelector<HTMLElement>('.goo-popout.goo-select-submenu-popout')!
			expect(submenu.getAttribute('dir')).toBe('rtl')
			expect(option.dataset.submenuSide).toBe('left')
			expect(option.classList.contains('goo-select__option--submenu-open-left')).toBe(true)
		} finally {
			restoreRects()
		}
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
		await delay(560)

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
		await delay(560)

		const popouts = document.querySelectorAll<HTMLElement>('.goo-popout.goo-select-submenu-popout')
		expect(popouts).toHaveLength(1)
		expect(popouts[0].querySelectorAll('.goo-select__submenu')).toHaveLength(1)
		expect(popouts[0].textContent).toContain('PNG')
		expect(popouts[0].textContent).not.toContain('Bring to Front')
		expect(popouts[0].textContent).not.toContain('Rotate')
	})

	it('closes a switched submenu after the pointer leaves the menu boundary', async() => {
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

		const panel = document.querySelector<HTMLElement>('.goo-popout.goo-select-popout .goo-select__options')!
		const orderOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="order"]')!
		const transformOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="transform"]')!
		orderOption.scrollIntoView = vi.fn()
		transformOption.scrollIntoView = vi.fn()

		orderOption.dispatchEvent(new MouseEvent('mouseenter'))
		await delay(320)
		expect(document.querySelector('.goo-popout.goo-select-submenu-popout')).not.toBeNull()

		transformOption.dispatchEvent(new MouseEvent('mouseenter'))
		await nextAnimationFrame()
		expect(document.querySelector('.goo-popout.goo-select-submenu-popout')?.textContent).toContain('Rotate')

		panel.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }))
		expect(transformOption.classList.contains('goo-select__option--hovered')).toBe(false)
		expect(panel.hasAttribute('aria-activedescendant')).toBe(false)
		expect(element.getHoveredOptionId()).toBeNull()
		await delay(520)

		expect(document.querySelector('.goo-popout.goo-select-submenu-popout')).toBeNull()
	})

	it('keeps the submenu open while hovering submenu children', async() => {
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
					}
				]
			}
		})
		const element = container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const orderOption = document.querySelector<HTMLElement>('.goo-select__option[data-id="order"]')!
		orderOption.scrollIntoView = vi.fn()
		orderOption.dispatchEvent(new MouseEvent('mouseenter'))
		await delay(320)

		const submenuOption = document.querySelector<HTMLElement>('.goo-select-submenu-popout .goo-select__option[data-id="front"]')!
		submenuOption.dispatchEvent(new MouseEvent('mouseenter'))
		await delay(320)

		expect(document.querySelector('.goo-popout.goo-select-submenu-popout')).not.toBeNull()
		expect(document.querySelector('.goo-popout.goo-select-submenu-popout')?.textContent).toContain('Bring to Front')
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

	it('ignores non-primary pointer release on already-open options', async() => {
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
		option.dispatchEvent(pointerEvent('pointerdown', { button: 2, buttons: 2, pointerId: 11 }))
		option.dispatchEvent(pointerEvent('pointerup', { button: 2, buttons: 0, pointerId: 11 }))
		await tick()

		expect(element.getValue()).toBe('a')
	})

	it('opens already-open submenu options on touch release', async() => {
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

		const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="more"]')!
		option.scrollIntoView = vi.fn()
		option.dispatchEvent(pointerEvent('pointerdown', { pointerId: 5, pointerType: 'touch' }))
		option.dispatchEvent(pointerEvent('pointerup', { pointerId: 5, pointerType: 'touch' }))
		await tick()

		const submenu = document.querySelector<HTMLElement>('.goo-popout.goo-select-submenu-popout')!
		expect(submenu).not.toBeNull()
		expect(submenu.textContent).toContain('Child')
		expect(element.getHoveredOptionId()).toBe('more')
	})

	it('clears panel selection animation timers when destroyed', () => {
		vi.useFakeTimers()
		const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
		const panel = new DropdownPanel({
			showSelectionIndicator: true,
			value: 'a',
			getContext: () => null,
			onSelect: vi.fn(),
			onHoverChange: vi.fn()
		})
		const option = document.createElement('div')
		panel.$container.appendChild(option)

		void panel.animateSelection(option)
		panel.destroy()

		expect(clearTimeoutSpy).toHaveBeenCalled()
		expect(panel.$container.dataset.isChoosingOption).toBe('')
		expect(option.dataset.isChosen).toBe('')
		expect(option.classList.contains('goo-select__option--flash')).toBe(false)
	})

	it('does not finish an animated selection after unmount', async() => {
		vi.useFakeTimers()
		const onchange = vi.fn()
		const { container, unmount } = render(GooSelect, {
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

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
		option.dispatchEvent(pointerEvent('pointerup', { pointerId: 12 }))
		await tick()
		unmount()
		vi.advanceTimersByTime(500)
		await Promise.resolve()

		expect(onchange).not.toHaveBeenCalled()
	})

	it('stops selection cleanup when an option callback unmounts the select', async() => {
		const onchange = vi.fn()
		let unmountSelect = () => {}
		const onChoose = vi.fn(() => unmountSelect())
		const rendered = render(GooSelect, {
			props: {
				value: 'a',
				showSelectionIndicator: false,
				options: [
					{ id: 'a', label: 'A' },
					{ id: 'b', label: 'B', onChoose }
				],
				onchange
			}
		})
		unmountSelect = rendered.unmount
		const element = rendered.container.querySelector<GooSelectElement>('.goo-select')!

		expect(element.open({ autoFocus: false })).toBe(true)
		await tick()

		const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="b"]')!
		option.dispatchEvent(pointerEvent('pointerdown', { pointerId: 13 }))
		option.dispatchEvent(pointerEvent('pointerup', { pointerId: 13 }))
		await tick()

		expect(onChoose).toHaveBeenCalledOnce()
		expect(onchange).not.toHaveBeenCalled()
	})

	it('opens submenu options under a pen pointer dragged from the trigger', async() => {
		const originalElementFromPoint = document.elementFromPoint
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
		const trigger = container.querySelector<HTMLElement>('.goo-select__trigger')!

		try {
			trigger.dispatchEvent(pointerEvent('pointerdown', { pointerId: 6, pointerType: 'pen', clientX: 20, clientY: 20 }))
			await tick()

			const option = document.querySelector<HTMLElement>('.goo-select__option[data-id="more"]')!
			option.scrollIntoView = vi.fn()
			document.elementFromPoint = vi.fn(() => option)
			document.dispatchEvent(pointerEvent('pointermove', { pointerId: 6, pointerType: 'pen', clientX: 20, clientY: 48 }))
			document.dispatchEvent(pointerEvent('pointerup', { pointerId: 6, pointerType: 'pen', clientX: 20, clientY: 48 }))
			await tick()

			const submenu = document.querySelector<HTMLElement>('.goo-popout.goo-select-submenu-popout')!
			expect(submenu).not.toBeNull()
			expect(submenu.textContent).toContain('Child')
			expect(element.getHoveredOptionId()).toBe('more')
		} finally {
			document.elementFromPoint = originalElementFromPoint
		}
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
	return new Promise(resolve => setTimeout(resolve, ms)) // test-shape: timing-probe - documented test timing behavior.
}

function installSubmenuPlacementRects({
	optionX,
	optionWidth,
	submenuWidth
}: {
	optionX: number
	optionWidth: number
	submenuWidth: number
}): () => void {
	const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

	HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
		if (this === document.documentElement || this === document.body) return rect(0, 0, 320, 240)
		if (this.classList.contains('goo-select__option') && this.dataset.id === 'more') {
			return rect(optionX, 32, optionWidth, 28)
		}
		if (this.classList.contains('goo-select-submenu-popout')) return rect(0, 0, submenuWidth, 80)
		if (this.classList.contains('goo-select-popout')) return rect(0, 0, 180, 120)
		if (this.classList.contains('goo-select')) return rect(24, 16, 120, 32)
		return originalGetBoundingClientRect.call(this)
	}

	return () => {
		HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
	}
}
