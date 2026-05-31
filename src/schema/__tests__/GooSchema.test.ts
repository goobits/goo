import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooSchema from '../GooSchema.svelte'
import { createGooSchema, GooSchema as GooSchemaElement } from '../index.ts'

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
		expect(schema).toBeInstanceOf(GooSchemaElement)
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
})
