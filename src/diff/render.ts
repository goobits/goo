/**
 * Visualization renderers for diff results.
 * On-demand rendering - only call when you need visual output.
 */

import type { DiffResult } from './compare.ts'

/**
 * Render a gradient visualization of differences.
 * Shows intensity of difference per pixel with amplification.
 *
 * - Brighter = bigger difference
 * - Color channels show which RGBA channels differ most
 * - Matching content shown as faint grayscale
 *
 * @param result - DiffResult from compare()
 * @param amplification - How much to boost diff visibility (default: 10)
 * @returns ImageData ready to draw to canvas
 */
export function renderGradient(result: DiffResult, amplification = 10): ImageData {
	const { diffs, width, height } = result
	const output = new ImageData(width, height)
	const data = output.data

	for (let i = 0; i < diffs.length; i++) {
		const diff = diffs[i]
		const outIdx = i * 4

		if (diff > 0) {
			// Amplify the difference for visibility
			const intensity = Math.min(255, diff * amplification)

			// Use a heat map: low diff = yellow, high diff = red
			if (intensity < 128) {
				// Yellow to orange
				data[outIdx] = 255
				data[outIdx + 1] = 255 - intensity
				data[outIdx + 2] = 0
			} else {
				// Orange to red
				data[outIdx] = 255
				data[outIdx + 1] = Math.max(0, 255 - intensity * 2)
				data[outIdx + 2] = 0
			}
			data[outIdx + 3] = 255
		} else {
			// No difference - transparent (shows background)
			data[outIdx] = 0
			data[outIdx + 1] = 0
			data[outIdx + 2] = 0
			data[outIdx + 3] = 0
		}
	}

	return output
}

/**
 * Render a binary visualization of differences.
 * Simple same/different view - useful for precise debugging.
 *
 * - Red = different
 * - Faint gray = same
 *
 * @param result - DiffResult from compare()
 * @returns ImageData ready to draw to canvas
 */
export function renderBinary(result: DiffResult): ImageData {
	const { diffs, width, height } = result
	const output = new ImageData(width, height)
	const data = output.data

	for (let i = 0; i < diffs.length; i++) {
		const diff = diffs[i]
		const outIdx = i * 4

		if (diff > 0) {
			// Different - solid red
			data[outIdx] = 255
			data[outIdx + 1] = 60
			data[outIdx + 2] = 60
			data[outIdx + 3] = 255
		} else {
			// Same - transparent (shows background)
			data[outIdx] = 0
			data[outIdx + 1] = 0
			data[outIdx + 2] = 0
			data[outIdx + 3] = 0
		}
	}

	return output
}
