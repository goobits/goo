// @ts-nocheck - Vitest globals handled at runtime
/**
 * pathUtils tests - Array-aware dot-notation path traversal
 */

import { getByPath, pathToLabel, resolvePath, setByPath } from '../schema/pathUtils.js'

describe('pathUtils', () => {
	describe('getByPath', () => {
		test('returns object for empty path', () => {
			const obj = { foo: 'bar' }
			expect(getByPath(obj, '')).toBe(obj)
		})

		test('gets simple property', () => {
			const obj = { name: 'test' }
			expect(getByPath(obj, 'name')).toBe('test')
		})

		test('gets nested property with dots', () => {
			const obj = { tip: { bristles: { count: 64 } } }
			expect(getByPath(obj, 'tip.bristles.count')).toBe(64)
		})

		test('gets array element with numeric index', () => {
			const obj = { layers: [ { enabled: true }, { enabled: false } ] }
			expect(getByPath(obj, 'layers.0.enabled')).toBe(true)
			expect(getByPath(obj, 'layers.1.enabled')).toBe(false)
		})

		test('gets array element with bracket notation', () => {
			const obj = { layers: [ { enabled: true }, { enabled: false } ] }
			expect(getByPath(obj, 'layers[0].enabled')).toBe(true)
			expect(getByPath(obj, 'layers[1].enabled')).toBe(false)
		})

		test('returns undefined for non-existent path', () => {
			const obj = { foo: 'bar' }
			expect(getByPath(obj, 'baz')).toBeUndefined()
			expect(getByPath(obj, 'foo.bar.baz')).toBeUndefined()
		})

		test('returns undefined when traversing through null', () => {
			const obj = { foo: null }
			expect(getByPath(obj, 'foo.bar')).toBeUndefined()
		})

		test('handles deeply nested arrays', () => {
			const obj = {
				stack: {
					layers: [
						{ brush: { tip: { size: 10 } } },
						{ brush: { tip: { size: 20 } } }
					]
				}
			}
			expect(getByPath(obj, 'stack.layers.0.brush.tip.size')).toBe(10)
			expect(getByPath(obj, 'stack.layers[1].brush.tip.size')).toBe(20)
		})
	})

	describe('setByPath', () => {
		test('sets simple property', () => {
			const obj: Record<string, unknown> = {}
			setByPath(obj, 'name', 'test')
			expect(obj.name).toBe('test')
		})

		test('sets nested property', () => {
			const obj: { tip: { bristles: { count?: number } } } = { tip: { bristles: {} } }
			setByPath(obj, 'tip.bristles.count', 64)
			expect(obj.tip.bristles.count).toBe(64)
		})

		test('creates intermediate objects', () => {
			const obj: Record<string, unknown> = {}
			setByPath(obj, 'tip.bristles.count', 64)
			expect((obj.tip as Record<string, unknown>).bristles).toBeDefined()
			expect(((obj.tip as Record<string, unknown>).bristles as Record<string, unknown>).count).toBe(64)
			expect(typeof obj.tip).toBe('object')
			expect(typeof (obj.tip as Record<string, unknown>).bristles).toBe('object')
		})

		test('sets array element with numeric index', () => {
			const obj = { layers: [ { enabled: true }, { enabled: true } ] }
			setByPath(obj, 'layers.0.enabled', false)
			expect(obj.layers[0].enabled).toBe(false)
			expect(obj.layers[1].enabled).toBe(true)
		})

		test('sets array element with bracket notation', () => {
			const obj = { layers: [ { enabled: true }, { enabled: true } ] }
			setByPath(obj, 'layers[1].enabled', false)
			expect(obj.layers[0].enabled).toBe(true)
			expect(obj.layers[1].enabled).toBe(false)
		})

		test('creates arrays when path contains numeric indices', () => {
			const obj: Record<string, unknown> = {}
			setByPath(obj, 'items.0.name', 'first')
			expect(Array.isArray(obj.items)).toBe(true)
			expect(((obj.items as unknown[])[0] as Record<string, unknown>).name).toBe('first')
		})

		test('throws for empty path', () => {
			const obj = {}
			expect(() => setByPath(obj, '', 'value')).toThrow()
		})

		test('throws when traversing through primitive', () => {
			const obj = { foo: 'string' }
			expect(() => setByPath(obj, 'foo.bar.baz', 'value')).toThrow()
		})
	})

	describe('resolvePath', () => {
		test('returns null for empty path', () => {
			const obj = { foo: 'bar' }
			expect(resolvePath(obj, '')).toBeNull()
		})

		test('resolves simple property', () => {
			const obj = { name: 'test' }
			const result = resolvePath(obj, 'name')
			expect(result).not.toBeNull()
			expect(result!.object).toBe(obj)
			expect(result!.property).toBe('name')
		})

		test('resolves nested property', () => {
			const obj = { tip: { bristles: { count: 64 } } }
			const result = resolvePath(obj, 'tip.bristles.count')
			expect(result).not.toBeNull()
			expect(result!.object).toBe(obj.tip.bristles)
			expect(result!.property).toBe('count')
		})

		test('resolves array element property', () => {
			const obj = { layers: [ { enabled: true }, { enabled: false } ] }
			const result = resolvePath(obj, 'layers.0.enabled')
			expect(result).not.toBeNull()
			expect(result!.object).toBe(obj.layers[0])
			expect(result!.property).toBe('enabled')
		})

		test('resolves array element with bracket notation', () => {
			const obj = { layers: [ { enabled: true }, { enabled: false } ] }
			const result = resolvePath(obj, 'layers[1].enabled')
			expect(result).not.toBeNull()
			expect(result!.object).toBe(obj.layers[1])
			expect(result!.property).toBe('enabled')
		})

		test('returns null for non-existent parent', () => {
			const obj = { foo: 'bar' }
			expect(resolvePath(obj, 'baz.qux')).toBeNull()
		})

		test('returns null when traversing through null', () => {
			const obj = { foo: null }
			expect(resolvePath(obj, 'foo.bar.baz')).toBeNull()
		})
	})

	describe('pathToLabel', () => {
		test('converts camelCase to title case', () => {
			expect(pathToLabel('lineWidth')).toBe('Line Width')
			expect(pathToLabel('strokeLineWidth')).toBe('Stroke Line Width')
		})

		test('uses last segment of path', () => {
			expect(pathToLabel('tip.bristles.count')).toBe('Count')
			expect(pathToLabel('stroke.lineWidth')).toBe('Line Width')
		})

		test('capitalizes first letter', () => {
			expect(pathToLabel('name')).toBe('Name')
			expect(pathToLabel('enabled')).toBe('Enabled')
		})

		test('handles numbers in names', () => {
			expect(pathToLabel('color0')).toBe('Color 0')
			expect(pathToLabel('layer1Opacity')).toBe('Layer 1 Opacity')
		})

		test('returns parent name for array index paths', () => {
			expect(pathToLabel('layers.0')).toBe('Layers')
			expect(pathToLabel('items[2]')).toBe('Items')
		})

		test('handles single segment paths', () => {
			expect(pathToLabel('opacity')).toBe('Opacity')
			expect(pathToLabel('0')).toBe('0')
		})
	})
})
