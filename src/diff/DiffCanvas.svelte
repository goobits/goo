<script lang="ts">
/**
 * Interactive diff canvas with hover toggle between gradient and binary views.
 *
 * Default: Gradient view (shows intensity of differences)
 * Hover: Binary view (shows exact same/different pixels)
 */

import { compare, type DiffResult } from './compare.ts'
import { renderGradient, renderBinary } from './render.ts'

interface Props {
	/** First image to compare */
	imageA: ImageData | HTMLCanvasElement
	/** Second image to compare */
	imageB: ImageData | HTMLCanvasElement
	/** Minimum total RGBA difference to count as different (default: 5) */
	threshold?: number
	/** How much to amplify differences in gradient view (default: 10) */
	amplification?: number
	/** CSS class for the canvas */
	class?: string
	/** Optional render key to force recomputation when canvas content changes */
	renderKey?: string | number
}

let {
	imageA,
	imageB,
	threshold = 5,
	amplification = 10,
	class: className = '',
	renderKey = ''
}: Props = $props()

let canvas: HTMLCanvasElement | undefined = $state(undefined)
let hovering = $state(false)

// Compute diff when inputs change
// renderKey is used to trigger recomputation when canvas content changes
const result: DiffResult = $derived.by(() => {
	void renderKey // Track renderKey to force recomputation
	return compare(imageA, imageB, { threshold })
})

// Render appropriate visualization based on hover state
const imageData: ImageData = $derived.by(() => {
	const isHovering = hovering
	return isHovering ? renderBinary(result) : renderGradient(result, amplification)
})

// Get DPR-aware display dimensions from input images
const displayWidth = $derived.by(() => {
	if (imageA instanceof HTMLCanvasElement) {
		// Canvas: use CSS width if set, otherwise the diff output width
		const cssWidth = parseFloat(imageA.style.width)
		return Number.isNaN(cssWidth) ? result.width : cssWidth
	}
	// ImageData: use the diff output width (max of both inputs), not just imageA
	return result.width
})

const displayHeight = $derived.by(() => {
	if (imageA instanceof HTMLCanvasElement) {
		const cssHeight = parseFloat(imageA.style.height)
		return Number.isNaN(cssHeight) ? result.height : cssHeight
	}
	return result.height
})

// Check if source canvas has inline CSS dimensions set
const hasInlineCSSDimensions = $derived.by(() => {
	if (imageA instanceof HTMLCanvasElement) {
		const hasWidth = imageA.style.width && !Number.isNaN(parseFloat(imageA.style.width))
		const hasHeight = imageA.style.height && !Number.isNaN(parseFloat(imageA.style.height))
		return hasWidth || hasHeight
	}
	return false
})

// Draw to canvas when imageData changes
$effect(() => {
	const data = imageData
	if (canvas && data) {
		canvas.width = data.width
		canvas.height = data.height
		// Only set inline CSS dimensions if source canvas has them
		// Otherwise, let CSS classes control sizing (allows responsive layouts)
		if (hasInlineCSSDimensions) {
			canvas.style.width = `${displayWidth}px`
			canvas.style.height = `${displayHeight}px`
		}
		const ctx = canvas.getContext('2d')!
		ctx.putImageData(data, 0, 0)
	}
})
</script>

<canvas
	bind:this={canvas}
	class={className}
	onmouseenter={() => hovering = true}
	onmouseleave={() => hovering = false}
	title="{result.matchPercent.toFixed(1)}% match ({result.diffCount} different pixels) - hover for binary view"
></canvas>

<style>
canvas {
	cursor: pointer;
}
</style>
