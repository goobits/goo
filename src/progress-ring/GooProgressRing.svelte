<script lang="ts">
import './GooProgressRing.css'
import {
	clampProgress,
	ProgressRingRenderer,
	type ProgressRingRenderConfig
} from './_progressRingRenderer.ts'
import type { GooProgressRingProps } from './types.ts'

let root: HTMLDivElement | undefined = $state()
let canvasEl: HTMLCanvasElement | undefined = $state()
let renderer: ProgressRingRenderer | undefined

let {
	progress = 0,
	size,
	thickness,
	color,
	showText = true,
	label = 'Progress',
	indeterminate = false,
	variant = 'basic',
	role = 'progressbar',
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	class: className = '',
	style,
	...rest
}: GooProgressRingProps = $props()

const normalizedProgress = $derived(clampProgress(progress))
const normalizedSize = $derived(Number.isFinite(size) && Number(size) > 0 ? Number(size) : undefined)
const normalizedThickness = $derived(
	Number.isFinite(thickness) ? Math.max(0, Number(thickness)) : undefined
)
const percent = $derived(Math.round(normalizedProgress * 100))
const classes = $derived([ 'goo-progress-ring', className ].filter(Boolean).join(' '))
const resolvedAriaLabelledby = $derived(toAttributeText(ariaLabelledby))
const resolvedAriaLabel = $derived(
	toAttributeText(ariaLabel) ?? (resolvedAriaLabelledby ? undefined : label)
)
const rootStyle = $derived([
	style,
	normalizedSize === undefined ? '' : `--goo-progress-ring-size:${ normalizedSize }px`,
	normalizedThickness === undefined ? '' : `--goo-progress-ring-thickness:${ normalizedThickness }px`,
	color ? `--goo-progress-ring-color:${ color }` : ''
].filter(Boolean).join(';'))

function toAttributeText(value: string | number | boolean | null | undefined): string | undefined {
	return value === null || value === undefined ? undefined : String(value)
}

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

$effect(() => {
	const r = ensureRenderer()
	if (!r) return

	r.configure({
		...(color === undefined ? {} : { fillStyle: color }),
		indeterminate,
		showText,
		...(normalizedThickness === undefined ? {} : { thickness: normalizedThickness }),
		variant
	})
	r.setProgress(normalizedProgress)
})

$effect(() => () => {
	renderer?.disconnect()
	renderer = undefined
})
</script>

<div
	{...rest}
	bind:this={root}
	class={classes}
	style={rootStyle}
	{role}
	aria-label={resolvedAriaLabel}
	aria-labelledby={resolvedAriaLabelledby}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={indeterminate ? undefined : percent}
	aria-valuetext={indeterminate ? undefined : `${ percent }%`}
	aria-busy={indeterminate}
	data-indeterminate={indeterminate}
	data-variant={variant}
>
	<canvas bind:this={canvasEl} aria-hidden="true"></canvas>
</div>
