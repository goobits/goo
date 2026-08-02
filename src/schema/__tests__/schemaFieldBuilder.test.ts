import { describe, expect, it } from 'vitest'

import { setLocale } from '../../support/i18n/index.ts'
import { buildControllerOptions } from '../schemaFieldBuilder.ts'

describe('schemaFieldBuilder', () => {
	it('forwards only declared control metadata', () => {
		const options = buildControllerOptions({
			path: 'size',
			type: 'slider-field',
			showInputs: true,
			canCross: false,
			canPush: true,
			xy: false,
			scale: 'linear',
			mode: 'single',
			gradient: [ '#000', '#fff' ],
			marks: [ { value: 10 } ],
			snap: 'marks',
			valueBubble: 'always',
			fullWidth: true,
			modes: [ 'normal', 'multiply' ],
			ariaLabel: 'Brush size',
			className: 'brush-size',
			dataParam: 'size',
			id: 'brush-size',
			items: [ { id: 'small' } ],
			popoutClass: 'brush-size-popout',
			tabIndex: 2,
			format: 'integer',
			controlOptions: { compact: true }
		}, { size: 10 }, 'size', 10)

		expect(options.controlOptions).toEqual({
			compact: true,
			showInputs: true,
			canCross: false,
			canPush: true,
			xy: false,
			scale: 'linear',
			mode: 'single',
			gradient: [ '#000', '#fff' ],
			marks: [ { value: 10 } ],
			snap: 'marks',
			valueBubble: 'always',
			fullWidth: true,
			modes: [ 'normal', 'multiply' ],
			ariaLabel: 'Brush size',
			className: 'brush-size',
			dataParam: 'size',
			id: 'brush-size',
			items: [ { id: 'small' } ],
			popoutClass: 'brush-size-popout',
			tabIndex: 2,
			format: 'integer'
		})
	})

	it('rejects field-owned settings inside controlOptions', () => {
		expect(() => buildControllerOptions({
			path: 'size',
			controlOptions: { min: 1 }
		}, { size: 10 }, 'size', 10)).toThrow(
			'GooSchema field "size" must define "min" at the field root, not in controlOptions.'
		)
	})

	it('localizes schema labels and keeps only choices whose conditions match', () => {
		setLocale({
			locale: 'schema-test',
			translate: key => `translated:${ key }`
		})
		try {
			const options = buildControllerOptions({
				path: 'textAlign',
				label: 'textAlign',
				ariaLabel: 'textAlign',
				options: [
					{ id: 'left', label: 'left', title: 'left' },
					{ id: 'justify-center', label: 'justifyCenter', if: '__ui.advancedAlignment' }
				]
			}, { textAlign: 'left' }, 'textAlign', 'left', {
				textAlign: 'left',
				__ui: { advancedAlignment: false }
			})

			expect(options.label).toBe('translated:textAlign')
			expect(options.controlOptions?.ariaLabel).toBe('translated:textAlign')
			expect(options.options).toEqual([
				{
					id: 'left',
					label: 'translated:left',
					title: 'translated:left'
				}
			])
		} finally {
			setLocale({ locale: 'en-US', translate: key => key })
		}
	})

	it('preserves nested select groups, dividers, icons, and conditional choices', () => {
		const options = buildControllerOptions({
			path: 'shape',
			type: 'select',
			options: [
				{
					type: 'optgroup',
					label: 'Basic Shapes',
					options: [
						{ id: 'square', label: 'Square', icon: 'square' },
						{ type: 'divider' },
						{ id: 'circle', label: 'Circle', unless: 'hideCircle' }
					]
				}
			]
		}, { shape: 'square' }, 'shape', 'square', { hideCircle: true })

		expect(options.options).toEqual([
			expect.objectContaining({
				type: 'optgroup',
				id: 'Basic Shapes',
				label: 'Basic Shapes',
				options: [
					expect.objectContaining({
						id: 'square',
						label: 'Square',
						icon: 'square'
					}),
					{ type: 'divider' }
				]
			})
		])
	})
})
