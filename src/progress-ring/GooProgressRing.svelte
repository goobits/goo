<script lang="ts">
import './GooProgressRing.css'
import { ProgressRingRenderer, type ProgressRingRenderConfig } from './_progressRingRenderer.ts'

let root: HTMLDivElement | undefined = $state()
let canvasEl: HTMLCanvasElement | undefined = $state()
let renderer: ProgressRingRenderer | undefined

// Lazily create the renderer on first use so an imperative caller (the timer)
// can configure() immediately after mount(), before any reactive $effect runs.
function ensureRenderer(): ProgressRingRenderer | undefined {
	if (!renderer && root && canvasEl) {
		renderer = new ProgressRingRenderer(root, canvasEl)
		renderer.connect()
	}
	return renderer
}

export function configure(options: ProgressRingRenderConfig): void {
	ensureRenderer()?.configure(options)
}

export function setProgress(progress: number, display?: { format?: string; value?: number | string }): void {
	ensureRenderer()?.setProgress(progress, display)
}

export function setIndeterminate(value: boolean): void {
	const r = ensureRenderer()
	if (r) r.indeterminate = value
}

export function getCanvas(): HTMLCanvasElement | undefined {
	return canvasEl
}

$effect(() => () => {
	renderer?.disconnect()
	renderer = undefined
})
</script>

<div bind:this={root} class="goo-progress-ring">
	<canvas bind:this={canvasEl}></canvas>
</div>
