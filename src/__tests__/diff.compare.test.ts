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

	test('reads canvas pixels without reconfiguring the consumer-owned context', () => {
		const pixels = createImageData([ 255, 0, 0, 255 ])
		const context = {
			clearRect: vi.fn(),
			drawImage: vi.fn(),
			getImageData: vi.fn(() => pixels)
		}
		const readbackCanvas = {
			width: 0,
			height: 0,
			getContext: vi.fn(() => context)
		}
		const sourceCanvas = {
			width: 1,
			height: 1,
			getContext: vi.fn(),
			ownerDocument: {
				createElement: vi.fn(() => readbackCanvas)
			}
		} as unknown as HTMLCanvasElement

		const result = compare(sourceCanvas, pixels)

		expect(sourceCanvas.getContext).not.toHaveBeenCalled()
		expect(readbackCanvas.getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true })
		expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1, 1)
		expect(context.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0)
		expect(result.diffCount).toBe(0)
	})
})

function createImageData(values: number[]) {
	return {
		width: 1,
		height: 1,
		data: new Uint8ClampedArray(values)
	} as ImageData
}
