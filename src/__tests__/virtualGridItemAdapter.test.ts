import { describe, expect, it } from 'vitest'

import {
	getGridItem,
	getGridItemElement,
	getVisibleGridIndexes,
	scrollToGridItem,
	setGridItemSelected
} from '../virtualGrid/itemAdapter.ts'

describe('virtualGridItemAdapter', () => {
	it('resolves falsey and numeric keys before index fallback', () => {
		const zeroKey = { key: 0, selected: false }
		const stringKey = { key: '1', selected: false }
		const items = [
			{ key: 'first', selected: false },
			zeroKey,
			stringKey
		]

		expect(getGridItem(items, '0')).toBe(zeroKey)
		expect(getGridItem(items, '1')).toBe(stringKey)
		expect(getGridItem(items, 1)).toBe(zeroKey)
	})

	it('resolves element refs from data-key and escaped selectors', () => {
		const root = document.createElement('div')
		const keyedElement = document.createElement('sketch-grid-item')
		keyedElement.dataset.key = 'paint"0'
		root.appendChild(keyedElement)

		const items = [
			{ key: 'paint"0' },
			{ key: 'other' }
		]

		expect(getGridItem(items, keyedElement)).toBe(items[0])
		expect(getGridItemElement(root, items, items[0])).toBe(keyedElement)
	})

	it('selects only when the target item state changes', () => {
		const items = [
			{ key: 0, selected: false },
			{ key: 'one', selected: true }
		]

		expect(setGridItemSelected(items, '0')).toBe(items[0])
		expect(items[0].selected).toBe(true)
		expect(setGridItemSelected(items, '0')).toBeUndefined()
		expect(setGridItemSelected(items, 'one', false)).toBe(items[1])
		expect(items[1].selected).toBe(false)
	})

	it('calculates visible indexes and scroll positions from Goo grid measurements', () => {
		const root = document.createElement('div')
		Object.defineProperties(root, {
			clientHeight: { value: 180 },
			scrollTop: { configurable: true, value: 90, writable: true }
		})

		const grid = document.createElement('div')
		grid.className = 'goo-virtual-grid'
		grid.dataset.columns = '3'
		root.appendChild(grid)

		const tile = document.createElement('sketch-grid-item')
		tile.getBoundingClientRect = () => ({
			bottom: 90,
			height: 90,
			left: 0,
			right: 90,
			top: 0,
			width: 90,
			x: 0,
			y: 0,
			toJSON: () => ({})
		})
		root.appendChild(tile)

		const items = Array.from({ length: 12 }, (_, index) => ({ key: index }))

		expect(getVisibleGridIndexes(root, items, 1, 90)).toEqual({
			startIndex: 0,
			endIndex: 11
		})

		scrollToGridItem(root, items, '6', 90)
		expect(root.scrollTop).toBe(180)
	})
})
