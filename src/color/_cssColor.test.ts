import { parseCssColorOrNull, rgbaToCssHex, rgbToHex } from './_cssColor.ts'

describe('_cssColor', () => {
	test('parses hex colors', () => {
		expect(parseCssColorOrNull('#f80')).toEqual({ r: 255, g: 136, b: 0 })
		expect(parseCssColorOrNull('#ff880080')).toEqual({ r: 255, g: 136, b: 0, a: 128 / 255 })
	})

	test('parses rgb and rgba colors', () => {
		expect(parseCssColorOrNull('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0 })
		expect(parseCssColorOrNull('rgb(100% 50% 0% / 25%)')).toEqual({ r: 255, g: 128, b: 0, a: 0.25 })
	})

	test('parses hsl and named colors', () => {
		expect(parseCssColorOrNull('hsl(30, 100%, 50%)')).toEqual({ r: 255, g: 128, b: 0 })
		expect(parseCssColorOrNull('rebeccapurple')).toEqual({ r: 102, g: 51, b: 153 })
	})

	test('parses transparent and rejects invalid colors', () => {
		expect(parseCssColorOrNull('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
		expect(parseCssColorOrNull('notacolor')).toBeNull()
		expect(parseCssColorOrNull(null)).toBeNull()
	})

	test('formats hex colors', () => {
		expect(rgbToHex(255, 128, 0)).toBe('#ff8000')
		expect(rgbToHex(999, 128.2, -10)).toBe('#ff8000')
		expect(rgbaToCssHex(1, 0.5, 0, 0.5)).toBe('#ff800080')
		expect(rgbaToCssHex(1, 0.5, 0, 1)).toBe('#ff8000')
	})
})
