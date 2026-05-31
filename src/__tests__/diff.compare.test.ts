import { compare } from '../diff/compare.ts'

describe('compare', () => {
	test('ignores RGB differences in fully transparent pixels', () => {
		const transparentRed = createImageData([ 255, 0, 0, 0 ])
		const transparentBlack = createImageData([ 0, 0, 0, 0 ])

		const result = compare(transparentRed, transparentBlack)

		expect(result.diffCount).toBe(0)
		expect(result.maxDiff).toBe(0)
		expect(result.matchPercent).toBe(100)
		expect(result.diffs[0]).toBe(0)
	})

	test('still reports RGB differences on visible pixels', () => {
		const red = createImageData([ 255, 0, 0, 255 ])
		const blue = createImageData([ 0, 0, 255, 255 ])

		const result = compare(red, blue)

		expect(result.contentCount).toBe(1)
		expect(result.diffCount).toBe(1)
		expect(result.maxDiff).toBe(510)
		expect(result.matchPercent).toBe(0)
	})
})

function createImageData(values: number[]) {
	return {
		width: 1,
		height: 1,
		data: new Uint8ClampedArray(values)
	} as ImageData
}
