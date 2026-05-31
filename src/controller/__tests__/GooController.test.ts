import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as checkboxModule from '../../checkbox/GooCheckbox.svelte'
import GooController from '../GooController.svelte'
import { createGooController, GooController as GooControllerElement } from '../index.js'

describe('GooController', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-controller').forEach(element => element.remove())
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
	})

	it('creates native controller elements without custom tags', () => {
		const model = { size: 12 }
		const controller = createGooController({ object: model, property: 'size', min: 0, max: 100 })
		document.body.appendChild(controller)

		expect(document.querySelector('goo-controller')).toBeNull()
		expect(controller.classList.contains('goo-controller')).toBe(true)
		expect(controller).toBeInstanceOf(GooControllerElement)
		expect(controller.getValue()).toBe(12)

		controller.setValue(24)
		expect(model.size).toBe(24)
	})

	it('renders the Svelte wrapper onto the native controller surface', async() => {
		const model = { enabled: true }
		let element: ReturnType<typeof createGooController> | null = null
		const { container } = render(GooController, {
			props: {
				object: model,
				property: 'enabled',
				get element() {
					return element
				},
				set element(value) {
					element = value
				}
			}
		})
		await tick()

		expect(container.querySelector('goo-controller')).toBeNull()
		expect(container.querySelector('.goo-controller')).toBe(element)
		expect(element?.getValue()).toBe(true)
	})

	it('uses checkbox row labels as accessible labels without duplicating visible text', async() => {
		const model = { contiguous: true }
		const controller = createGooController({
			object: model,
			property: 'contiguous',
			type: 'checkbox',
			label: 'Contiguous'
		})
		document.body.appendChild(controller)
		await controller._controlPromise
		await tick()

		const checkbox = controller.querySelector('.goo-checkbox')

		expect(controller.getAttribute('data-label')).toBe('Contiguous')
		expect(checkbox?.getAttribute('aria-label')).toBe('Contiguous')
		expect(controller.querySelector('.goo-checkbox__label')).toBeNull()
	})

	it('uses registry layout preferences for large Svelte controls', async() => {
		const model = { color: true }
		const controller = createGooController({
			object: model,
			property: 'color',
			type: 'checkbox',
			label: 'Fill Color',
			controlTypes: {
				checkbox: {
					load: () => Promise.resolve(checkboxModule),
					svelte: true,
					layout: 'stacked'
				}
			}
		})
		document.body.appendChild(controller)
		await controller._controlPromise
		await tick()

		expect(controller.classList.contains('goo-controller--stacked')).toBe(true)
		expect(controller.querySelector('.goo-controller__header .goo-label')?.textContent).toBe('Fill Color')
		expect(controller.querySelector('.goo-controller__widget')).not.toBeNull()
	})

	it('stacks button groups by default so segmented controls fit sidebars', async() => {
		const model = { antialiasing: 'fxaa-high' }
		const controller = createGooController({
			object: model,
			property: 'antialiasing',
			type: 'button-group',
			label: 'Anti-aliasing',
			options: [
				{ label: 'None', value: 'none' },
				{ label: 'FXAA Low', value: 'fxaa-low' },
				{ label: 'FXAA High', value: 'fxaa-high' }
			]
		})
		document.body.appendChild(controller)
		await controller._controlPromise
		await tick()

		expect(controller.classList.contains('goo-controller--stacked')).toBe(true)
		expect(controller.querySelector('.goo-controller__header .goo-label')?.textContent).toBe('Anti aliasing')
		expect(controller.querySelector('.goo-button-group')).not.toBeNull()
	})

	it('skips redundant display updates when the control already matches the model', () => {
		const model = { size: 12 }
		const controller = createGooController({ object: model, property: 'size', min: 0, max: 100 })
		const setValue = vi.fn()
		controller._control = Object.assign(document.createElement('div'), {
			getValue: () => 12,
			setValue
		})

		controller.updateDisplay()

		expect(setValue).not.toHaveBeenCalled()
	})

	it('passes select menu options through to GooSelect controls', async() => {
		const model = { units: 'px' }
		const controller = createGooController({
			object: model,
			property: 'units',
			type: 'select',
			options: [
				{ label: 'Pixels', value: 'px' },
				{ label: 'Inches', value: 'in' }
			],
			menu: {
				variant: 'attached',
				width: 'content'
			}
		})
		document.body.appendChild(controller)
		await controller._controlPromise
		await tick()

		const select = controller.querySelector<HTMLElement>('.goo-select') as HTMLElement & { open: (options?: { autoFocus?: boolean }) => boolean }
		expect(select.open({ autoFocus: false })).toBe(true)
		await tick()

		const popout = document.querySelector<HTMLElement>('.goo-popout.goo-select-popout')!
		expect(popout.classList.contains('goo-select-popout--menu-attached')).toBe(true)
		expect(popout.querySelector('.goo-select__options--width-content')).not.toBeNull()
	})
})
