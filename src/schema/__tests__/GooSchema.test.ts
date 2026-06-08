import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isSelfContainedField } from '../fieldLayout.ts'
import GooSchema from '../GooSchema.svelte'
import { createGooSchema } from '../index.ts'

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
		await new Promise(resolve => setTimeout(resolve, 50))

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
		await new Promise(resolve => setTimeout(resolve, 50))

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
		await new Promise(resolve => setTimeout(resolve, 50))

		const folder = schema.querySelector('.goo-folder')
		expect(folder?.classList.contains('goo-folder--inspector')).toBe(true)
		expect(folder?.classList.contains('shape-folder')).toBe(true)
	})

	it('renders the Svelte wrapper and forwards change events', async() => {
		const onchange = vi.fn()
		let instance: ReturnType<typeof createGooSchema> | null = null
		const { container } = render(GooSchema, {
			props: {
				schema: [ { path: 'enabled', type: 'checkbox' } ],
				data: { enabled: true },
				bare: true,
				onchange,
				get instance() {
					return instance
				},
				set instance(value) {
					instance = value
				}
			}
		})
		await tick()
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(container.querySelector('goo-schema')).toBeNull()
		expect(container.querySelector('.goo-schema')).toBe(instance)
		instance?.dispatchEvent(new CustomEvent('change', { detail: { path: 'enabled', value: false, data: instance.getData() } }))
		expect(onchange).toHaveBeenCalledOnce()
	})

	it('remounts the Svelte wrapper when creation options change', async() => {
		const { container, rerender } = render(GooSchema, {
			props: {
				schema: [ { path: 'size', min: 0, max: 100 } ],
				data: { size: 12 },
				bare: true
			}
		})
		await tick()
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(container.querySelector('.goo-schema__bare')).not.toBeNull()

		await rerender({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 12 },
			bare: false,
			showPanelHeader: false
		})
		await tick()
		await new Promise(resolve => setTimeout(resolve, 50))

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
		await tick()
		await new Promise(resolve => setTimeout(resolve, 50))

		const firstController = container.querySelector('.goo-controller')
		expect(firstController).not.toBeNull()

		await rerender({
			schema,
			data: { size: 24 },
			bare: true
		})
		await tick()
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(container.querySelector('.goo-controller')).toBe(firstController)
	})

	it('keeps imperative schema controllers mounted across data updates', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'size', min: 0, max: 100 } ],
			data: { size: 12 },
			bare: true
		})
		document.body.appendChild(schema)
		await new Promise(resolve => setTimeout(resolve, 50))

		const firstController = schema.getController('size')
		expect(firstController).not.toBeUndefined()

		schema.setData({ size: 24 })
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(schema.getController('size')).toBe(firstController)
		expect(schema.getData().size).toBe(24)
	})

	it('accepts same-object data updates without rebuilding nested controllers', async() => {
		const data = { shape: { size: 12 } }
		const schema = createGooSchema({
			schema: [ { path: 'shape.size', min: 0, max: 100 } ],
			data,
			bare: true
		})
		document.body.appendChild(schema)
		await new Promise(resolve => setTimeout(resolve, 50))

		const firstController = schema.getController('shape.size')
		expect(firstController).not.toBeUndefined()

		data.shape.size = 24
		schema.setData(data)
		await new Promise(resolve => setTimeout(resolve, 50))

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
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(receivedOptions).toMatchObject({
			canCross: true,
			canPush: true,
			max: 100,
			min: 0
		})
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
		await new Promise(resolve => setTimeout(resolve, 50))

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
		await new Promise(resolve => setTimeout(resolve, 50))

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
		await new Promise(resolve => setTimeout(resolve, 50))

		expect(receivedOptions).toMatchObject({
			format: 'percent',
			fullWidth: true,
			unit: '%'
		})
		expect(receivedOptions).not.toHaveProperty('label')
		expect((schema.getController('opacity') as HTMLElement).getAttribute('data-label')).toBe('')
	})

	it('recognizes self-contained field layout metadata', () => {
		expect(isSelfContainedField({
			path: 'mode',
			type: 'standalone',
			layout: 'self-contained'
		})).toBe(true)
	})
})
