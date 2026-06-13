import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineSvelteControlType } from '../../controller/index.ts'
import GridPopoutPicker from '../../grid-popout/GridPopoutPicker.svelte'
import { isFullBleedField, isSelfContainedField } from '../fieldLayout.ts'
import GooSchema from '../GooSchema.svelte'
import { createGooSchema, schemaHasConditions } from '../index.ts'
import SelfContainedInputControl from './SelfContainedInputControl.svelte'

async function settleGooSchema(): Promise<void> {
	await tick()
	await Promise.resolve()
}

const gridPopoutControlType = defineSvelteControlType({
	load: () => Promise.resolve({
		default: GridPopoutPicker,
		controlSchema: {
			valueKey: 'selected',
			changeKey: 'onchoose',
			selfContained: true,
			propMapping: {
				ariaLabel: 'ariaLabel',
				class: 'class',
				dataParam: 'dataParam',
				id: 'id',
				items: 'items',
				popoutClass: 'popoutClass',
				tabIndex: 'tabIndex'
			}
		}
	})
})

const selfContainedInputControlType = defineSvelteControlType({
	load: () => Promise.resolve({
		default: SelfContainedInputControl,
		controlSchema: {
			valueKey: 'value',
			changeKey: 'onchange',
			inputKey: 'oninput',
			selfContained: true
		}
	})
})

describe('GooSchema', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-schema').forEach(element => element.remove())
	})

	it('creates native schema elements without custom tags', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 12 },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(document.querySelector('goo-schema')).toBeNull()
		expect(schema.classList.contains('goo-schema')).toBe(true)
		expect(schema).toBeInstanceOf(HTMLDivElement)
		expect(typeof schema.destroy).toBe('function')
		expect(schema.querySelector('.goo-controller')).not.toBeNull()
		expect(schema.getController('size')).not.toBeUndefined()
	})

	it('can render generated panels without their header', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 12 },
			showPanelHeader: false
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(schema.querySelector('.goo-panel')).not.toBeNull()
		expect(schema.querySelector('.goo-panel__header')).toBeNull()
	})

	it('applies configured classes to generated folders', async() => {
		const schema = createGooSchema({
			schema: [
				{
					type: 'folder',
					title: 'Shape',
					className: 'shape-folder',
					children: [ { path: 'size', min: 0, max: 100 } ]
				}
			],
			data: { size: 12 },
			bare: true,
			folderClassName: 'goo-folder--inspector'
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const folder = schema.querySelector('.goo-folder')
		expect(folder?.classList.contains('goo-folder--inspector')).toBe(true)
		expect(folder?.classList.contains('shape-folder')).toBe(true)
	})

	it('materializes missing field parents from defaults', async() => {
		const data: Record<string, unknown> = {}
		const schema = createGooSchema({
			schema: [ { path: 'style.fillOpacity', min: 0, max: 1 } ],
			data,
			defaults: { style: { fillOpacity: 0.75 } },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(schema.querySelector('.goo-controller')).not.toBeNull()
		expect(data).toEqual({ style: { fillOpacity: 0.75 } })
		expect(schema.getController('style.fillOpacity')).not.toBeUndefined()
	})

	it('renders the Svelte wrapper and forwards change events', async() => {
		const onchange = vi.fn()
		const onpreset = vi.fn()
		const onreset = vi.fn()
		let instance: ReturnType<typeof createGooSchema> | null = null
		const { container } = render(GooSchema, {
			props: {
				schema: [ { path: 'enabled', type: 'checkbox' } ],
				data: { enabled: true },
				defaults: { enabled: true },
				presets: [ { id: 'off', label: 'Off', data: { enabled: false } } ],
				showReset: true,
				bare: true,
				onchange,
				onpreset,
				onreset,
				get instance() {
					return instance
				},
				set instance(value) {
					instance = value
				}
			}
		})
		await settleGooSchema()

		expect(container.querySelector('goo-schema')).toBeNull()
		expect(container.querySelector('.goo-schema')).toBe(instance)
		instance?.dispatchEvent(new CustomEvent('change', { detail: { path: 'enabled', value: false, data: instance.getData() } }))
		instance?.dispatchEvent(new CustomEvent('preset', { detail: { id: 'off', preset: { id: 'off', label: 'Off', data: { enabled: false } }, data: { enabled: false } } }))
		instance?.dispatchEvent(new CustomEvent('reset', { detail: { data: { enabled: true }, defaults: { enabled: true } } }))
		expect(onchange).toHaveBeenCalledOnce()
		expect(onpreset).toHaveBeenCalledOnce()
		expect(onreset).toHaveBeenCalledOnce()
	})

	it('forwards input events from self-contained Svelte controls', async() => {
		const oninput = vi.fn()
		const data = { size: 12 }
		const { container } = render(GooSchema, {
			props: {
				schema: [ { path: 'size', type: 'self-contained-input' } ],
				data,
				bare: true,
				controlTypes: {
					'self-contained-input': selfContainedInputControlType
				},
				oninput
			}
		})
		await settleGooSchema()

		container.querySelector<HTMLButtonElement>('.self-contained-input-control')?.click()
		await tick()

		expect(oninput).toHaveBeenCalledOnce()
		expect(oninput.mock.calls[0]?.[0].detail).toMatchObject({ path: 'size', value: 13 })
		expect(data.size).toBe(13)
	})

	it('remounts the Svelte wrapper when creation options change', async() => {
		const { container, rerender } = render(GooSchema, {
			props: {
				schema: [ { path: 'size', min: 0, max: 100 } ],
				data: { size: 12 },
				bare: true
			}
		})
		await settleGooSchema()

		expect(container.querySelector('.goo-schema__bare')).not.toBeNull()

		await rerender({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 12 },
			bare: false,
			showPanelHeader: false
		})
		await settleGooSchema()

		expect(container.querySelector('.goo-panel')).not.toBeNull()
		expect(container.querySelector('.goo-panel__header')).toBeNull()
	})

	it('updates data without rebuilding unchanged controllers', async() => {
		const schema = [ { path: 'size', min: 0, max: 100 } ]
		const { container, rerender } = render(GooSchema, {
			props: {
				schema,
				data: { size: 12 },
				bare: true
			}
		})
		await settleGooSchema()

		const firstController = container.querySelector('.goo-controller')
		const slider = container.querySelector<HTMLElement>('.goo-slider')
		expect(firstController).not.toBeNull()
		expect(slider?.getAttribute('aria-valuenow')).toBe('12')

		await rerender({
			schema,
			data: { size: 24 },
			bare: true
		})
		await settleGooSchema()

		expect(container.querySelector('.goo-controller')).toBe(firstController)
		expect(slider?.getAttribute('aria-valuenow')).toBe('24')
	})

	it('refreshes wrapper controls when same-object data changes by value', async() => {
		const schema = [ { path: 'size', min: 0, max: 100 } ]
		const data = { size: 12 }
		const { container, rerender } = render(GooSchema, {
			props: {
				schema,
				data,
				bare: true
			}
		})
		await settleGooSchema()

		const firstController = container.querySelector('.goo-controller')
		const slider = container.querySelector<HTMLElement>('.goo-slider')
		expect(firstController).not.toBeNull()
		expect(slider?.getAttribute('aria-valuenow')).toBe('12')

		data.size = 32
		await rerender({
			schema,
			data,
			bare: true
		})
		await settleGooSchema()

		expect(container.querySelector('.goo-controller')).toBe(firstController)
		expect(slider?.getAttribute('aria-valuenow')).toBe('32')
	})

	it('keeps imperative schema controllers mounted across data updates', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 12 },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const firstController = schema.getController('size')
		expect(firstController).not.toBeUndefined()

		schema.setData({ size: 24 })
		await settleGooSchema()

		expect(schema.getController('size')).toBe(firstController)
		expect(schema.getData().size).toBe(24)
	})

	it('keeps conditional schema controllers mounted when visibility is unchanged', async() => {
		const schema = createGooSchema({
			schema: [
				{ path: 'mode', options: [ 'basic', 'advanced' ] },
				{ path: 'size', min: 0, max: 100, if: { path: 'mode', equals: 'advanced' } },
				{ path: 'opacity', min: 0, max: 1, if: { path: 'mode', equals: 'advanced' } }
			],
			data: {
				mode: 'advanced',
				opacity: 0.5,
				size: 12
			},
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const sizeController = schema.getController('size')
		const opacityController = schema.getController('opacity')
		expect(sizeController).not.toBeUndefined()
		expect(opacityController).not.toBeUndefined()

		schema.setData({
			mode: 'advanced',
			opacity: 0.75,
			size: 24
		})
		await settleGooSchema()

		expect(schema.getController('size')).toBe(sizeController)
		expect(schema.getController('opacity')).toBe(opacityController)
		expect(schema.getData()).toMatchObject({
			mode: 'advanced',
			opacity: 0.75,
			size: 24
		})
	})

	it('rebuilds conditional schema controllers when visibility changes', async() => {
		const schema = createGooSchema({
			schema: [
				{ path: 'mode', options: [ 'basic', 'advanced' ] },
				{ path: 'basicSize', min: 0, max: 100, if: { path: 'mode', equals: 'basic' } },
				{ path: 'advancedSize', min: 0, max: 100, if: { path: 'mode', equals: 'advanced' } }
			],
			data: {
				advancedSize: 24,
				basicSize: 8,
				mode: 'basic'
			},
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const modeController = schema.getController('mode')
		const basicController = schema.getController('basicSize')
		expect(modeController).not.toBeUndefined()
		expect(basicController).not.toBeUndefined()
		expect(schema.getController('advancedSize')).toBeUndefined()

		schema.setData({
			advancedSize: 24,
			basicSize: 8,
			mode: 'advanced'
		})
		await settleGooSchema()

		expect(schema.getController('mode')).not.toBe(modeController)
		expect(schema.getController('basicSize')).toBeUndefined()
		expect(schema.getController('advancedSize')).not.toBeUndefined()
	})

	it('forwards self-contained Svelte control metadata and refreshes display on data updates', async() => {
		const schema = createGooSchema({
			schema: [
				{
					path: 'type',
					type: 'grid-popout',
					ariaLabel: 'Subtool',
					class: 'goo-grid-trigger--subtool',
					dataParam: 'type',
					id: 'UISubTool',
					items: [
						{ id: 'star', title: 'Star', iconClass: 'icon-star' },
						{ id: 'ring', title: 'Ring', iconClass: 'icon-ring' }
					],
					layout: 'self-contained',
					popoutClass: 'goo-grid-popout--icon-grid goo-grid-popout--subtool',
					showLabel: false
				}
			],
			data: { type: 'star' },
			bare: true,
			controlTypes: {
				'grid-popout': gridPopoutControlType
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const trigger = schema.querySelector<HTMLElement>('#UISubTool')
		expect(trigger).not.toBeNull()
		expect(trigger?.getAttribute('data-param')).toBe('type')
		expect(trigger?.classList.contains('goo-grid-trigger--subtool')).toBe(true)
		expect(trigger?.textContent).toContain('Star')

		schema.setData({ type: 'ring' })
		await settleGooSchema()

		expect(schema.querySelector('#UISubTool')).toBe(trigger)
		expect(trigger?.textContent).toContain('Ring')
	})

	it('resets schema data to defaults without rebuilding unchanged controllers', async() => {
		const onreset = vi.fn()
		const schema = createGooSchema({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 24 },
			defaults: { size: 12 },
			showReset: true,
			bare: true,
			onreset
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const controller = schema.getController('size')
		const reset = schema.querySelector<HTMLButtonElement>('.goo-schema__reset')
		expect(controller).not.toBeUndefined()
		expect(reset).not.toBeNull()
		expect(reset?.disabled).toBe(false)

		reset?.click()
		await settleGooSchema()

		expect(schema.getController('size')).toBe(controller)
		expect(schema.getData()).toEqual({ size: 12 })
		expect(onreset).toHaveBeenCalledWith({ size: 12 })
		expect(reset?.disabled).toBe(true)
	})

	it('applies named schema presets and emits preset events', async() => {
		const onpreset = vi.fn()
		const presetEvent = vi.fn()
		const presets = [
			{ id: 'small', label: 'Small', data: { shape: { size: 8 } } },
			{ id: 'large', label: 'Large', data: { shape: { size: 32 } } }
		]
		const schema = createGooSchema({
			schema: [ { path: 'shape.size', min: 0, max: 100 } ],
			data: { shape: { size: 8 } },
			presets,
			activePresetId: 'small',
			bare: true,
			onpreset
		})
		schema.addEventListener('preset', presetEvent)
		document.body.appendChild(schema)
		await settleGooSchema()

		const controller = schema.getController('shape.size')
		const select = schema.querySelector<HTMLSelectElement>('.goo-schema__preset-select')
		expect(controller).not.toBeUndefined()
		expect(select?.value).toBe('small')

		if (select) {
			select.value = 'large'
			select.dispatchEvent(new Event('change', { bubbles: true }))
		}
		await settleGooSchema()

		expect(schema.getController('shape.size')).toBe(controller)
		expect(schema.getData()).toEqual({ shape: { size: 32 } })
		expect(onpreset).toHaveBeenCalledWith(presets[1])
		expect(presetEvent.mock.calls[0]?.[0].detail).toMatchObject({
			id: 'large',
			data: { shape: { size: 32 } }
		})
	})

	it('accepts same-object data updates without rebuilding nested controllers', async() => {
		const data = { shape: { size: 12 } }
		const schema = createGooSchema({
			schema: [ { path: 'shape.size', min: 0, max: 100 } ],
			data,
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const firstController = schema.getController('shape.size')
		expect(firstController).not.toBeUndefined()

		data.shape.size = 24
		schema.setData(data)
		await settleGooSchema()

		expect(schema.getController('shape.size')).toBe(firstController)
		expect(schema.getData().shape).toBe(data.shape)
	})

	it('forwards rich range metadata to controller controls', async() => {
		let receivedOptions: Record<string, unknown> | undefined
		const schema = createGooSchema({
			schema: [
				{
					path: 'size',
					type: 'range-module',
					min: 0,
					max: 100,
					canCross: true,
					canPush: true
				}
			],
			data: { size: 12 },
			bare: true,
			controlTypes: {
				'range-module': {
					load: () => Promise.resolve({}),
					extract: () => options => {
						receivedOptions = options as Record<string, unknown>
						return Object.assign(document.createElement('div'), {
							getValue: () => 12,
							setValue: vi.fn()
						})
					}
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(receivedOptions).toMatchObject({
			canCross: true,
			canPush: true,
			max: 100,
			min: 0
		})
	})

	it('auto-detects xy pad controls for point fields', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'scatter', min: -100, max: 100, step: 1, unit: 'px' } ],
			data: { scatter: { x: 0, y: 0 } },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const controller = schema.getController('scatter')
		expect(controller?.querySelector('.goo-xy-pad')).not.toBeNull()
	})

	it('supports condition objects for field visibility', async() => {
		const schema = createGooSchema({
			schema: [
				{ path: 'visibleSize', min: 0, max: 100, if: { path: 'mode', equals: 'advanced' } },
				{ path: 'hiddenSize', min: 0, max: 100, unless: { path: 'mode', equals: 'advanced' } }
			],
			data: {
				hiddenSize: 8,
				mode: 'advanced',
				visibleSize: 12
			},
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(schema.getController('visibleSize')).not.toBeUndefined()
		expect(schema.getController('hiddenSize')).toBeUndefined()
	})

	it('maps percent format to percent unit when unit is omitted', async() => {
		let receivedOptions: Record<string, unknown> | undefined
		const schema = createGooSchema({
			schema: [
				{
					path: 'opacity',
					type: 'range-module',
					format: 'percent',
					min: 0,
					max: 1,
					step: 0.01,
					ticks: true
				}
			],
			data: { opacity: 0.5 },
			bare: true,
			controlTypes: {
				'range-module': {
					load: () => Promise.resolve({}),
					extract: () => options => {
						receivedOptions = options as Record<string, unknown>
						return Object.assign(document.createElement('div'), {
							getValue: () => 0.5,
							setValue: vi.fn()
						})
					}
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(receivedOptions).toMatchObject({
			format: 'percent',
			ticks: true,
			unit: '%'
		})
	})

	it('supports value display options and hidden generated labels', async() => {
		let receivedOptions: Record<string, unknown> | undefined
		const schema = createGooSchema({
			schema: [
				{
					path: 'opacity',
					type: 'range-module',
					valueFormat: 'percent',
					displayUnit: '%',
					showLabel: false,
					fullWidth: true,
					min: 0,
					max: 1,
					step: 0.01
				}
			],
			data: { opacity: 0.5 },
			bare: true,
			controlTypes: {
				'range-module': {
					load: () => Promise.resolve({}),
					extract: () => options => {
						receivedOptions = options as Record<string, unknown>
						return Object.assign(document.createElement('div'), {
							getValue: () => 0.5,
							setValue: vi.fn()
						})
					}
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(receivedOptions).toMatchObject({
			format: 'percent',
			fullWidth: true,
			unit: '%'
		})
		expect(receivedOptions).not.toHaveProperty('label')
		expect((schema.getController('opacity') as HTMLElement).getAttribute('data-label')).toBe('')
	})

	it('marks full-bleed schema fields on their controller row', async() => {
		const schema = createGooSchema({
			schema: [
				{
					path: 'cropPane',
					type: 'dom-control',
					layout: 'full-bleed'
				}
			],
			data: { cropPane: false },
			bare: true,
			controlTypes: {
				'dom-control': {
					load: () => Promise.resolve({}),
					extract: () => () => Object.assign(document.createElement('div'), {
						getValue: () => false,
						setValue: vi.fn()
					})
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(schema.getController('cropPane')?.classList.contains('goo-controller--full-bleed')).toBe(true)
	})

	it('recognizes self-contained field layout metadata', () => {
		expect(isSelfContainedField({
			path: 'mode',
			type: 'standalone',
			layout: 'self-contained'
		})).toBe(true)
	})

	it('recognizes full-bleed field layout metadata', () => {
		expect(isFullBleedField({
			path: 'cropPane',
			type: 'dom-control',
			layout: 'full-bleed'
		})).toBe(true)
		expect(isFullBleedField({
			path: 'cropPane',
			type: 'dom-control',
			fullBleed: true
		})).toBe(true)
	})

	it('detects conditional schema nodes through the public helper', () => {
		expect(schemaHasConditions([
			{
				type: 'folder',
				title: 'Advanced',
				children: [
					{ path: 'enabled', type: 'checkbox' },
					{ path: 'size', type: 'range', if: { path: 'enabled', equals: true } }
				]
			}
		])).toBe(true)
		expect(schemaHasConditions([
			{ path: 'size', type: 'range' }
		])).toBe(false)
	})
})
