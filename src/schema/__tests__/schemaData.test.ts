import { describe, expect, it } from 'vitest'

import {
	cloneSchemaValue,
	isSchemaValueEqual
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
})
