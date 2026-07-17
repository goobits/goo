import { describe, expect, it } from 'vitest'

import { setLocale } from '../../support/i18n/index.ts'
import { buildControllerOptions } from '../schemaFieldBuilder.ts'

describe('schemaFieldBuilder', () => {
	it('forwards only declared control metadata', () => {
		const options = buildControllerOptions({
			path: 'size',
			type: 'slider-field',
			input: true,
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
			class: 'brush-size',
			dataParam: 'size',
			id: 'brush-size',
			items: [ { id: 'small' } ],
			popoutClass: 'brush-size-popout',
			tabIndex: 2,
			valueFormat: 'integer',
			controlOptions: { compact: true }
		}, { size: 10 }, 'size', 10)

		expect(options.controlOptions).toEqual({
			compact: true,
			input: true,
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
			class: 'brush-size',
			dataParam: 'size',
			id: 'brush-size',
			items: [ { id: 'small' } ],
			popoutClass: 'brush-size-popout',
			tabIndex: 2,
			format: 'integer'
		})
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
					{ id: 'left', label: 'left', tooltip: 'left' },
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
					tooltip: 'translated:left'
				}
			])
		} finally {
			setLocale({ locale: 'en-US', translate: key => key })
		}
	})
})
