import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineSvelteControlType } from '../../controller/index.ts'
import GridPopoutPicker from '../../grid-popout/GridPopoutPicker.svelte'
import { setLocale } from '../../support/i18n/index.ts'
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

function dispatchKey(element: HTMLElement, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key
	})
	element.dispatchEvent(event)
	return event
}

async function waitForSchemaElement<T extends HTMLElement>(schema: HTMLElement, selector: string): Promise<T> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const element = schema.querySelector<T>(selector)
		if (element) return element
		await settleGooSchema()
		await new Promise(resolve => setTimeout(resolve, 0))
	}

	throw new Error(`GooSchema test element not found: ${ selector }\n${ schema.innerHTML }`)
}

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

const decoratedSvelteControlType = defineSvelteControlType({
	load: () => Promise.resolve({
		default: SelfContainedInputControl,
		controlSchema: {
			selfContained: true,
			propMapping: { message: 'message' }
		}
	}),
	buildOptions: (_value, options) => ({
		...options,
		message: 'Built by registry policy'
	})
})

describe('GooSchema', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-schema').forEach(element => element.remove())
		setLocale({ locale: 'en-US', translate: key => key })
	})

	it('localizes compact schema text while preserving authored phrases', async() => {
		setLocale({
			locale: 'schema-text-test',
			translate: key => `translated:${ key }`
		})
		const schema = createGooSchema({
			schema: [
				{
					type: 'folder',
					title: 'appearance',
					open: true,
					children: [ { path: 'size', label: 'brushSize' } ]
				},
				{ type: 'note', text: 'Helpful authored phrase.' }
			],
			data: { size: 12 },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()
		await waitForSchemaElement(schema, '.goo-controller')

		expect(schema.querySelector('.goo-folder__title')?.textContent).toContain('translated:appearance')
		expect(schema.querySelector('.goo-schema__note')?.textContent).toBe('Helpful authored phrase.')
	})

	it('renders heading nodes with an icon chip when the icon is registered', async() => {
		const { iconRegistry } = await import('../../icon/registry.ts')
		iconRegistry.register('spacing-test', '<svg viewBox="0 0 16 16"><path d="M0 8h16" /></svg>')
		const schema = createGooSchema({
			schema: [
				{ type: 'heading', text: 'Spacing group', icon: 'spacing-test' },
				{ type: 'heading', text: 'Chipless group', icon: 'missing-icon' },
				{ path: 'size', min: 0, max: 100 }
			],
			data: { size: 12 },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()
		await waitForSchemaElement(schema, '.goo-controller')

		const headings = schema.querySelectorAll('.goo-schema__heading')
		expect(headings).toHaveLength(2)
		expect(headings[0]?.getAttribute('role')).toBe('heading')
		expect(headings[0]?.querySelector('.goo-schema__heading-chip svg')).toBeTruthy()
		expect(headings[0]?.querySelector('.goo-schema__heading-text')?.textContent).toBe('Spacing group')
		expect(headings[1]?.querySelector('.goo-schema__heading-chip')).toBeNull()
		expect(headings[1]?.querySelector('.goo-schema__heading-text')?.textContent).toBe('Chipless group')
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

	it('forwards disabled schema fields to their generated controllers', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'size', min: 0, max: 100, disabled: true } ],
			data: { size: 12 },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const controller = schema.getController('size')
		const slider = await waitForSchemaElement<HTMLElement>(schema, '.goo-slider')
		expect(controller?.isDisabled()).toBe(true)
		expect(controller?.getAttribute('aria-disabled')).toBe('true')
		expect(slider.getAttribute('aria-disabled')).toBe('true')
	})

	it('supports direct keyboard navigation from schema-owned focus targets', async() => {
		const schema = createGooSchema({
			schema: [
				{
					type: 'folder',
					title: 'Shape',
					open: true,
					children: [
						{ path: 'size', min: 0, max: 100 },
						{ path: 'name' }
					]
				}
			],
			data: { size: 12, name: 'Marker' },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const folderHeader = await waitForSchemaElement<HTMLElement>(schema, '.goo-folder__header')
		const textInput = await waitForSchemaElement<HTMLInputElement>(schema, '.goo-input__content')
		const parent = document.createElement('div')
		const parentKeydown = vi.fn()
		parent.addEventListener('keydown', parentKeydown)
		document.body.appendChild(parent)
		parent.appendChild(schema)
		expect(schema.tabIndex).toBe(0)
		expect(schema.getAttribute('role')).toBe('group')

		schema.focus()
		const arrowDown = dispatchKey(schema, 'ArrowDown')

		expect(arrowDown.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(document.activeElement).toBe(folderHeader)

		const end = dispatchKey(folderHeader, 'End')
		expect(end.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(textInput)

		folderHeader.focus()
		const home = dispatchKey(folderHeader, 'Home')
		expect(home.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(folderHeader)

		schema.focus()
		const arrowUp = dispatchKey(schema, 'ArrowUp')
		expect(arrowUp.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(textInput)
		parent.remove()
	})

	it('leaves native schema inputs in charge of editing keys', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'name' } ],
			data: { name: 'Marker' },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const textInput = await waitForSchemaElement<HTMLInputElement>(schema, '.goo-input__content')
		textInput.focus()
		const home = dispatchKey(textInput, 'Home')

		expect(home.defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(textInput)
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

	it('applies registry option policy to Svelte controls', async() => {
		const schema = createGooSchema({
			schema: [ { path: 'size', type: 'decorated-svelte' } ],
			data: { size: 12 },
			bare: true,
			controlTypes: {
				'decorated-svelte': decoratedSvelteControlType
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const control = await waitForSchemaElement<HTMLElement>(schema, '.self-contained-input-control')
		expect(control.dataset.message).toBe('Built by registry policy')
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

	it('preserves folder state and focus across structurally equal schema props', async() => {
		const createSchema = () => [ {
			type: 'folder' as const,
			title: 'Taper',
			open: false,
			children: [ { path: 'taper', min: 0, max: 100 } ]
		} ]
		const { container, rerender } = render(GooSchema, {
			props: {
				schema: createSchema(),
				data: { taper: 48 },
				defaults: { taper: 10 },
				bare: true
			}
		})
		await settleGooSchema()

		const folder = container.querySelector<HTMLElement>('.goo-folder')
		const folderHeader = folder?.querySelector<HTMLElement>('.goo-folder__header')
		const slider = container.querySelector<HTMLElement>('.goo-slider')
		expect(folder).not.toBeNull()
		expect(folderHeader).not.toBeNull()
		expect(slider).not.toBeNull()
		folderHeader!.click()
		slider!.focus()
		expect(folder?.classList.contains('goo-folder--open')).toBe(true)
		expect(document.activeElement).toBe(slider)

		await rerender({
			schema: createSchema(),
			data: { taper: 48 },
			defaults: { taper: 10 },
			bare: true
		})
		await settleGooSchema()

		expect(container.querySelector('.goo-folder')).toBe(folder)
		expect(container.querySelector('.goo-slider')).toBe(slider)
		expect(folder?.classList.contains('goo-folder--open')).toBe(true)
		expect(document.activeElement).toBe(slider)
		expect(slider?.getAttribute('aria-valuenow')).toBe('48')
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
		schema.refreshConditions()
		await settleGooSchema()
		expect(schema.getController('size')).toBe(sizeController)
		expect(schema.getController('opacity')).toBe(opacityController)

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

	it('rebuilds fields when conditional choices change', async() => {
		const schema = createGooSchema({
			schema: [ {
				path: 'mode',
				options: [
					'basic',
					{ id: 'advanced', label: 'Advanced', if: '__ui.showAdvanced' }
				]
			} ],
			data: { mode: 'basic', __ui: { showAdvanced: false } },
			bare: true
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const firstController = schema.getController('mode')
		expect(firstController).not.toBeUndefined()

		schema.setData({ mode: 'basic', __ui: { showAdvanced: true } })
		await settleGooSchema()

		expect(schema.getController('mode')).not.toBe(firstController)
	})

	it('forwards self-contained Svelte control metadata and refreshes display on data updates', async() => {
		const schema = createGooSchema({
			schema: [
				{
					path: 'type',
					type: 'grid-popout',
					ariaLabel: 'Subtool',
					class: 'goo-grid-trigger--compact',
					dataParam: 'type',
					id: 'UISubTool',
					items: [
						{ id: 'star', title: 'Star', iconClass: 'icon-star' },
						{ id: 'ring', title: 'Ring', iconClass: 'icon-ring' }
					],
					layout: 'self-contained',
					dock: 'pinned',
					popoutClass: 'goo-grid-popout--icon-grid goo-grid-popout--compact',
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

		const trigger = await waitForSchemaElement<HTMLElement>(schema, '#UISubTool')
		expect(trigger?.getAttribute('data-param')).toBe('type')
		// Shells relocate docked controls by the zone stamped on the root.
		expect(schema.querySelector('[data-goo-control-type="grid-popout"]')?.getAttribute('data-goo-dock')).toBe('pinned')
		expect(trigger?.classList.contains('goo-grid-trigger--compact')).toBe(true)
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
		expect((controller as HTMLElement).classList.contains('goo-schema__data-motion')).toBe(true)
		expect((controller as HTMLElement).getAttribute('data-goo-schema-data-motion')).toBe('reset')
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
		expect((controller as HTMLElement).classList.contains('goo-schema__data-motion')).toBe(true)
		expect((controller as HTMLElement).getAttribute('data-goo-schema-data-motion')).toBe('preset')
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
					type: 'slider-field',
					min: 0,
					max: 100,
					canCross: true,
					canPush: true
				}
			],
			data: { size: 12 },
			bare: true,
			controlTypes: {
				'slider-field': {
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

	it('destroys child controllers when the schema is destroyed', async() => {
		const destroyControl = vi.fn()
		const schema = createGooSchema({
			schema: [ { path: 'size', type: 'destroyable-control' } ],
			data: { size: 12 },
			bare: true,
			controlTypes: {
				'destroyable-control': {
					load: () => Promise.resolve({}),
					extract: () => () => Object.assign(document.createElement('div'), {
						destroy: destroyControl,
						getValue: () => 12,
						setValue: vi.fn()
					})
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		expect(schema.getController('size')).not.toBeUndefined()

		schema.destroy()
		schema.destroy()

		expect(destroyControl).toHaveBeenCalledOnce()
	})

	it('renders notes and unbound widgets without adding schema data', async() => {
		const destroyWidget = vi.fn()
		const refreshWidget = vi.fn()
		const setWidgetValue = vi.fn()
		const schema = createGooSchema({
			schema: [
				{ type: 'note', text: 'Choose a source before continuing.' },
				{
					type: 'widget',
					widget: 'camera-preview',
					id: 'cameraPreview',
					showLabel: false,
					options: { compact: true }
				}
			],
			data: {},
			bare: true,
			controlTypes: {
				'camera-preview': {
					load: () => Promise.resolve({}),
					extract: () => options => Object.assign(document.createElement('div'), {
						destroy: destroyWidget,
						refresh: refreshWidget,
						setValue: setWidgetValue,
						textContent: options.compact === true ? 'Camera' : 'Preview'
					})
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()
		const widget = await waitForSchemaElement<HTMLElement>(
			schema,
			'.goo-controller--camera-preview .goo-controller__widget > div'
		)

		expect(schema.querySelector('[role="note"]')?.textContent).toBe('Choose a source before continuing.')
		expect(widget.textContent).toBe('Camera')
		expect(schema.getData()).toEqual({})

		schema.setData({ unrelated: true })
		expect(refreshWidget).toHaveBeenCalledOnce()
		expect(setWidgetValue).not.toHaveBeenCalled()
		expect(schema.getData()).toEqual({ unrelated: true })

		schema.destroy()
		expect(destroyWidget).toHaveBeenCalledOnce()
	})

	it('renders self-contained widgets without a controller row', async() => {
		const schema = createGooSchema({
			schema: [
				{
					type: 'widget',
					widget: 'camera-preview',
					id: 'cameraPreview',
					layout: 'self-contained',
					className: 'camera-preview-host',
					options: { compact: true }
				}
			],
			data: {},
			bare: true,
			controlTypes: {
				'camera-preview': {
					load: () => Promise.resolve({}),
					extract: () => options => Object.assign(document.createElement('div'), {
						className: 'camera-preview',
						textContent: options.compact === true ? 'Camera' : 'Preview'
					})
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const widget = await waitForSchemaElement<HTMLElement>(schema, '.camera-preview')
		expect(widget.classList.contains('camera-preview-host')).toBe(true)
		expect(widget.classList.contains('goo-schema__self-contained')).toBe(true)
		expect(widget.dataset.gooControlType).toBe('camera-preview')
		expect(widget.textContent).toBe('Camera')
		expect(schema.querySelector('.goo-controller')).toBeNull()
		expect(schema.getController('cameraPreview')).toBe(widget)
	})

	it('binds self-contained factory controls directly to schema data', async() => {
		const setValue = vi.fn()
		let change: ((value: unknown) => void) | undefined
		const schema = createGooSchema({
			schema: [
				{
					path: 'size',
					type: 'standalone-control',
					layout: 'self-contained',
					showLabel: false
				}
			],
			data: { size: 12 },
			bare: true,
			controlTypes: {
				'standalone-control': {
					load: () => Promise.resolve({}),
					extract: () => options => {
						change = options.onchange as (value: unknown) => void
						return Object.assign(document.createElement('div'), {
							className: 'standalone-control',
							setValue
						})
					}
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const control = await waitForSchemaElement<HTMLElement>(schema, '.standalone-control')
		expect(control.classList.contains('goo-schema__self-contained')).toBe(true)
		expect(control.dataset.gooControlType).toBe('standalone-control')
		expect(schema.querySelector('.goo-controller')).toBeNull()
		expect(schema.getController('size')).toBe(control)

		change?.(18)
		expect(schema.getData()).toEqual({ size: 18 })

		schema.setData({ size: 24 })
		expect(setValue).toHaveBeenCalledWith(24, { silent: true })
	})

	it('destroys previous child controllers when rebuilding schema', async() => {
		const destroyControl = vi.fn()
		const schema = createGooSchema({
			schema: [ { path: 'size', type: 'destroyable-control' } ],
			data: { size: 12, opacity: 0.5 },
			bare: true,
			controlTypes: {
				'destroyable-control': {
					load: () => Promise.resolve({}),
					extract: () => () => Object.assign(document.createElement('div'), {
						destroy: destroyControl,
						getValue: () => 12,
						setValue: vi.fn()
					})
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		const firstController = schema.getController('size')
		expect(firstController).not.toBeUndefined()

		schema.setSchema([ { path: 'opacity', type: 'destroyable-control' } ])
		await settleGooSchema()

		expect(destroyControl).toHaveBeenCalledOnce()
		expect(schema.getController('size')).toBeUndefined()
		expect(schema.getController('opacity')).not.toBeUndefined()
	})

	it('does not rebuild after destroy when a rebuild was already queued', async() => {
		const destroyControl = vi.fn()
		const schema = createGooSchema({
			schema: [ { path: 'size', type: 'destroyable-control' } ],
			data: { size: 12 },
			bare: true,
			controlTypes: {
				'destroyable-control': {
					load: () => Promise.resolve({}),
					extract: () => () => Object.assign(document.createElement('div'), {
						destroy: destroyControl,
						getValue: () => 12,
						setValue: vi.fn()
					})
				}
			}
		})
		document.body.appendChild(schema)
		await settleGooSchema()

		schema.setOptions({ showReset: true })
		schema.destroy()
		await settleGooSchema()

		expect(destroyControl).toHaveBeenCalledOnce()
		expect(schema.querySelector('.goo-controller')).toBeNull()
		expect(schema.getController('size')).toBeUndefined()
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
					type: 'slider-field',
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
				'slider-field': {
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
					type: 'slider-field',
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
				'slider-field': {
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
					type: 'custom-editor',
					layout: 'full-bleed'
				}
			],
			data: { cropPane: false },
			bare: true,
			controlTypes: {
				'custom-editor': {
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
			type: 'custom-editor',
			layout: 'full-bleed'
		})).toBe(true)
		expect(isFullBleedField({
			path: 'cropPane',
			type: 'custom-editor',
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

	it('detects conditions declared on field choices', () => {
		expect(schemaHasConditions([ {
			path: 'mode',
			options: [
				'basic',
				{ id: 'advanced', if: '__ui.showAdvanced' }
			]
		} ])).toBe(true)
	})
})
