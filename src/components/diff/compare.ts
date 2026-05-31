/**
 * Image comparison algorithm for pixel-level diffing.
 * Pure functions with no DOM dependencies - can run in workers.
 */

export interface DiffResult {

	/** Per-pixel diff magnitude (0-255 normalized) */
	diffs: Uint8Array

	/** Number of pixels exceeding threshold */
	diffCount: number

	/** Number of pixels with meaningful content (alpha > threshold) */
	contentCount: number

	/** Total pixel count */
	totalCount: number

	/** Maximum per-pixel difference found */
	maxDiff: number

	/** Percentage of matching pixels (0-100) */
	matchPercent: number

	/** Bounding box of differences, null if identical */
	bounds: { x1: number; y1: number; x2: number; y2: number } | null

	/** Image dimensions */
	width: number
	height: number
}

export interface DiffOptions {

	/** Minimum total RGBA difference to count as different (default: 5) */
	threshold?: number

	/** Minimum alpha to count as content pixel (default: 20) */
	alphaThreshold?: number
}

const DEFAULT_OPTIONS: Required<DiffOptions> = {
	threshold: 5,
	alphaThreshold: 20
}

/**
 * Extract ImageData from input (handles both ImageData and HTMLCanvasElement)
 */
function toImageData(input: ImageData | HTMLCanvasElement): ImageData {
	if (typeof ImageData !== 'undefined' && input instanceof ImageData) {
		return input
	}
	if ('data' in input && 'width' in input && 'height' in input) {
		return input
	}
	const ctx = input.getContext('2d', { willReadFrequently: true })!
	return ctx.getImageData(0, 0, input.width, input.height)
}

/**
 * Compare two images and compute diff statistics.
 *
 * @param a - First image (ImageData or HTMLCanvasElement)
 * @param b - Second image (ImageData or HTMLCanvasElement)
 * @param options - Comparison options
 * @returns Diff result with statistics and per-pixel diff values
 */
export function compare(
	a: ImageData | HTMLCanvasElement,
	b: ImageData | HTMLCanvasElement,
	options?: DiffOptions
): DiffResult {
	const opts = { ...DEFAULT_OPTIONS, ...options }
	const { threshold, alphaThreshold } = opts

	const imgA = toImageData(a)
	const imgB = toImageData(b)

	// Handle size mismatch by using the larger dimensions
	const width = Math.max(imgA.width, imgB.width)
	const height = Math.max(imgA.height, imgB.height)
	const totalCount = width * height

	// Per-pixel diff values (0-255 normalized)
	const diffs = new Uint8Array(totalCount)

	let diffCount = 0
	let contentCount = 0
	let maxDiff = 0

	// Bounding box tracking
	let x1 = width
	let y1 = height
	let x2 = 0
	let y2 = 0

	// Helper to get pixel value, returns 0 for out-of-bounds
	const getPixel = (img: ImageData, x: number, y: number, channel: number): number => {
		if (x >= img.width || y >= img.height) return 0
		const idx = (y * img.width + x) * 4 + channel
		return img.data[idx]
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const pixelIdx = y * width + x

			// Get RGBA values from both images
			const rA = getPixel(imgA, x, y, 0)
			const gA = getPixel(imgA, x, y, 1)
			const bA = getPixel(imgA, x, y, 2)
			const aA = getPixel(imgA, x, y, 3)

			const rB = getPixel(imgB, x, y, 0)
			const gB = getPixel(imgB, x, y, 1)
			const bB = getPixel(imgB, x, y, 2)
			const aB = getPixel(imgB, x, y, 3)

			// Check if this pixel has content
			const hasContent = aA > alphaThreshold || aB > alphaThreshold
			if (hasContent) contentCount++

			// Calculate per-channel differences
			const rDiff = Math.abs(rA - rB)
			const gDiff = Math.abs(gA - gB)
			const bDiff = Math.abs(bA - bB)
			const aDiff = Math.abs(aA - aB)
			const pixelDiff = rDiff + gDiff + bDiff + aDiff

			if (!hasContent) {
				continue
			}

			// Normalize to 0-255 (max possible diff is 255*4=1020)
			diffs[pixelIdx] = Math.min(255, Math.round((pixelDiff / 1020) * 255))
			maxDiff = Math.max(maxDiff, pixelDiff)

			if (pixelDiff > threshold) {
				diffCount++

				// Update bounding box
				if (x < x1) x1 = x
				if (y < y1) y1 = y
				if (x > x2) x2 = x
				if (y > y2) y2 = y
			}
		}
	}

	// Calculate match percentage based on content pixels
	const denominator = contentCount > 0 ? contentCount : totalCount
	const matchPercent = denominator > 0 ? ((denominator - diffCount) / denominator) * 100 : 100

	// Build bounds (null if no differences)
	const bounds = diffCount > 0
		? { x1, y1, x2: x2 + 1, y2: y2 + 1 }
		: null

	return {
		diffs,
		diffCount,
		contentCount,
		totalCount,
		maxDiff,
		matchPercent,
		bounds,
		width,
		height
	}
}
