import { describe, expect, it } from 'vitest'

import {
	cloneSchemaValue,
	getSchemaVisibilitySignature,
	isSchemaValueEqual,
	schemaHasConditions
} from '../_schemaData.ts'

describe('schema data records', () => {
	it('compares and snapshots record instances by their enumerable values', () => {
		class PaintValue {
			constructor(public opacity: number) {}
		}
		const value = new PaintValue(0.5)

		expect(isSchemaValueEqual(value, new PaintValue(0.5))).toBe(true)
		expect(isSchemaValueEqual(value, new PaintValue(0.75))).toBe(false)
		expect(cloneSchemaValue(value)).toEqual({ opacity: 0.5 })
		expect(cloneSchemaValue(value)).not.toBe(value)
	})

	it('tracks conditions nested inside select groups', () => {
		const schema = [ {
			path: 'shape',
			type: 'select' as const,
			options: [ {
				type: 'optgroup' as const,
				label: 'Basic Shapes',
				options: [
					{ id: 'square', label: 'Square' },
					{ id: 'circle', label: 'Circle', if: 'showCircle' }
				]
			} ]
		} ]
		const element = {
			_data: { shape: 'square', showCircle: false },
			state: { schema }
		}

		expect(schemaHasConditions(schema)).toBe(true)
		const hiddenSignature = getSchemaVisibilitySignature(element)
		element._data.showCircle = true
		expect(getSchemaVisibilitySignature(element)).not.toBe(hiddenSignature)
	})
})
