import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as checkboxModule from '../../checkbox/GooCheckbox.svelte'
import GooController from '../GooController.svelte'
import { createGooController, type GooController as GooControllerElement } from '../index.ts'

async function waitForControllerControl(controller: GooControllerElement): Promise<HTMLElement> {
	for (let attempt = 0; attempt < 10; attempt++) {
		await Promise.resolve()
		await tick()
		const control = controller.getControlElement()
		if (control) return control
	}
	throw new Error('Expected controller control to be ready')
}

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
		expect(typeof controller.destroy).toBe('function')
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

	it('updates the Svelte wrapper after props change', async() => {
		const model = { size: 12 }
		const { container, rerender } = render(GooController, {
			props: {
				object: model,
				property: 'size',
				min: 0,
				max: 100
			}
		})
		await tick()

		expect(container.querySelector('.goo-controller')).not.toBeNull()

		await rerender({
			object: model,
			property: 'size',
			min: 0,
			max: 200
		})
		await tick()

		expect(container.querySelector('.goo-controller')).not.toBeNull()
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
		await waitForControllerControl(controller)

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
		await waitForControllerControl(controller)

		expect(controller.classList.contains('goo-controller--stacked')).toBe(true)
		expect(controller.querySelector('.goo-controller__header .goo-label')?.textContent).toBe('Fill Color')
		expect(controller.querySelector('.goo-controller__widget')).not.toBeNull()
	})

	it('treats stacked labels as text instead of HTML', async() => {
		const model = { enabled: true }
		const controller = createGooController({
			object: model,
			property: 'enabled',
			type: 'checkbox',
			label: '<img src=x onerror=alert(1)>',
			controlTypes: {
				checkbox: {
					load: () => Promise.resolve(checkboxModule),
					svelte: true,
					layout: 'stacked'
				}
			}
		})
		document.body.appendChild(controller)
		await waitForControllerControl(controller)

		const label = controller.querySelector('.goo-controller__header .goo-label')
		expect(label?.textContent).toBe('<img src=x onerror=alert( 1)>')
		expect(label?.querySelector('img')).toBeNull()
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
		await waitForControllerControl(controller)

		expect(controller.classList.contains('goo-controller--stacked')).toBe(true)
		expect(controller.querySelector('.goo-controller__header .goo-label')?.textContent).toBe('Anti aliasing')
		expect(controller.querySelector('.goo-button-group')).not.toBeNull()
	})

	it('skips redundant display updates when the control already matches the model', async() => {
		const model = { size: 12 }
		const controller = createGooController({ object: model, property: 'size', min: 0, max: 100 })
		document.body.appendChild(controller)
		const control = await waitForControllerControl(controller) as HTMLElement & {
			setValue?: (value: unknown, options?: { silent?: boolean }) => void
		}
		const originalSetValue = control.setValue?.bind(control)
		const setValue = vi.fn()
		control.setValue = (value, options) => {
			setValue(value, options)
			originalSetValue?.(value, options)
		}

		controller.refresh()

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
		await waitForControllerControl(controller)

		const select = controller.querySelector<HTMLElement>('.goo-select') as HTMLElement & { open: (options?: { autoFocus?: boolean }) => boolean }
		expect(select.open({ autoFocus: false })).toBe(true)
		await tick()

		const popout = document.querySelector<HTMLElement>('.goo-popout.goo-select-popout')!
		expect(popout.classList.contains('goo-select-popout--menu-attached')).toBe(true)
		expect(popout.querySelector('.goo-select__options--width-content')).not.toBeNull()
	})

	it('mounts Svelte controls when the bound value is missing', async() => {
		const model: Record<string, unknown> = {}
		const angle = createGooController({
			object: model,
			property: 'angle',
			type: 'angle',
			unit: 'degree'
		})
		const select = createGooController({
			object: model,
			property: 'choice',
			type: 'select',
			options: [
				{ label: 'First', value: 'first' },
				{ label: 'Second', value: 'second' }
			]
		})
		document.body.append(angle, select)

		await waitForControllerControl(angle)
		await waitForControllerControl(select)

		expect(angle.querySelector('.goo-angle-input')).not.toBeNull()
		expect(select.querySelector('.goo-select')).not.toBeNull()
		expect(model.angle).toBeUndefined()
		expect(model.choice).toBeUndefined()
	})

	it('renders blend-mode controls as compact select pickers', async() => {
		const model = { blendMode: 'overlay' }
		const controller = createGooController({
			object: model,
			property: 'blendMode',
			type: 'blend-mode',
			label: 'Blend',
			controlOptions: {
				modes: [ 'normal', 'multiply', 'screen', 'overlay' ]
			}
		})
		document.body.appendChild(controller)
		await waitForControllerControl(controller)

		const picker = controller.querySelector<HTMLElement>('.goo-blend-mode-picker')
		expect(controller.classList.contains('goo-controller--stacked')).toBe(false)
		expect(picker?.classList.contains('goo-select')).toBe(true)
		expect(picker?.querySelector('.goo-select__trigger-label')?.textContent).toBe('Overlay')
		expect(controller.querySelector('.goo-button-group')).toBeNull()
	})

	it('forwards custom control options through the registry', async() => {
		const model = { size: 12 }
		let receivedOptions: Record<string, unknown> | undefined
		const controller = createGooController({
			object: model,
			property: 'size',
			type: 'custom-range',
			min: 0,
			max: 100,
			controlOptions: {
				canCross: true,
				canPush: true
			},
			controlTypes: {
				'custom-range': {
					load: () => Promise.resolve({}),
					extract: () => {
						return options => {
							receivedOptions = options as Record<string, unknown>
							return Object.assign(document.createElement('div'), {
								getValue: () => model.size,
								setOptions: nextOptions => {
									receivedOptions = nextOptions as Record<string, unknown>
								}
							})
						}
					}
				}
			}
		})
		document.body.appendChild(controller)
		await waitForControllerControl(controller)

		expect(receivedOptions).toMatchObject({
			canCross: true,
			canPush: true,
			max: 100,
			min: 0
		})
	})

	it('destroys the mounted control when the controller is destroyed', async() => {
		const model = { size: 12 }
		const destroyControl = vi.fn()
		const controller = createGooController({
			object: model,
			property: 'size',
			type: 'custom-destroyable',
			controlTypes: {
				'custom-destroyable': {
					load: () => Promise.resolve({}),
					extract: () => () => Object.assign(document.createElement('div'), {
						destroy: destroyControl,
						getValue: () => model.size,
						setValue: vi.fn()
					})
				}
			}
		})
		document.body.appendChild(controller)
		await waitForControllerControl(controller)

		controller.destroy()
		controller.destroy()

		expect(destroyControl).toHaveBeenCalledOnce()
	})

	it('destroys stale async controls created after the controller was removed', async() => {
		const model = { size: 12 }
		const destroyControl = vi.fn()
		let resolveModule: ((module: object) => void) | undefined
		const controller = createGooController({
			object: model,
			property: 'size',
			type: 'slow-control',
			controlTypes: {
				'slow-control': {
					load: () => new Promise(resolve => {
						resolveModule = resolve
					}),
					extract: () => () => Object.assign(document.createElement('div'), {
						destroy: destroyControl,
						getValue: () => model.size,
						setValue: vi.fn()
					})
				}
			}
		})
		document.body.appendChild(controller)

		controller.destroy()
		resolveModule?.({})
		await tick()
		await Promise.resolve()

		expect(destroyControl).toHaveBeenCalledOnce()
	})

	it('auto-detects xy pad controls for point values', async() => {
		const model = { scatter: { x: 0, y: 0 } }
		const controller = createGooController({
			object: model,
			property: 'scatter',
			label: 'Scatter',
			min: -100,
			max: 100,
			step: 1,
			unit: 'px'
		})
		document.body.appendChild(controller)
		await waitForControllerControl(controller)

		expect(controller.classList.contains('goo-controller--stacked')).toBe(true)
		expect(controller.querySelector('.goo-xy-pad')).not.toBeNull()
	})
})
