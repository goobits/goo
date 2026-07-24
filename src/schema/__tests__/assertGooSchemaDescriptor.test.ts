import { describe, expect, it } from 'vitest'

import { assertGooSchemaDescriptor } from '../assertGooSchemaDescriptor.ts'

describe('assertGooSchemaDescriptor', () => {
	it('accepts fields, folders, widgets, notes, and portable control data', () => {
		expect(() => assertGooSchemaDescriptor({
			type: 'panel',
			title: 'Brush',
			children: [
				{
					type: 'folder',
					id: 'stroke',
					title: 'Stroke',
					actions: { history: true, reset: true },
					children: [ {
						path: 'size',
						type: 'slider-field',
						min: 1,
						max: 100,
						controlOptions: { tone: { light: true } },
						items: [ { id: 'small', size: 1 } ],
						if: { path: 'enabled', equals: true }
					} ]
				},
				{ type: 'note', text: 'Choose a size.' },
				{ type: 'widget', widget: 'brush-preview', options: { compact: true } }
			]
		})).not.toThrow()
	})

	it('accepts a single node at app registration boundaries', () => {
		expect(() => assertGooSchemaDescriptor({
			path: 'opacity',
			type: 'slider-field',
			min: 0,
			max: 1
		})).not.toThrow()
	})

	it('rejects callbacks, constructed objects, accessors, and cycles', () => {
		expect(() => assertGooSchemaDescriptor({
			path: 'size',
			controlOptions: { render: () => 'legacy' }
		})).toThrow(/schema\.controlOptions\.render.*found function/)

		expect(() => assertGooSchemaDescriptor({
			path: 'size',
			items: [ new URL('https://example.test') ]
		})).toThrow(/found constructed URL/)

		const accessor = Object.create(null) as Record<string, unknown>
		Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 1 })
		expect(() => assertGooSchemaDescriptor({
			path: 'size',
			controlOptions: accessor
		})).toThrow(/must be a data property; found an accessor/)

		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		expect(() => assertGooSchemaDescriptor({
			path: 'size',
			controlOptions: cyclic
		})).toThrow(/must be plain data; found a cycle/)
	})

	it('rejects unknown node, condition, and choice keys', () => {
		expect(() => assertGooSchemaDescriptor({
			path: 'size',
			legacyRenderer: 'slider'
		})).toThrow("schema.legacyRenderer': is not a declared GooSchema field key")

		expect(() => assertGooSchemaDescriptor({
			path: 'size',
			if: { path: 'enabled', legacyEquals: true }
		})).toThrow("schema.if.legacyEquals': is not a declared GooSchema condition key")

		expect(() => assertGooSchemaDescriptor({
			path: 'mode',
			options: [ { id: 'draw', label: 'Draw', component: 'legacy' } ]
		})).toThrow("schema.options[0].component': is not a declared GooSchema choice option key")

		expect(() => assertGooSchemaDescriptor({
			type: 'folder',
			title: 'Style',
			actions: { legacyUndo: true },
			children: []
		})).toThrow("schema.actions.legacyUndo': is not a declared GooSchema folder actions key")
	})
})
