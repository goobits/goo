<script lang="ts">
import { untrack } from 'svelte'

import './GooProgressRing.css'
import {
	createProgressStatusDwell,
	DEFAULT_PROGRESS_STATUS_DWELL_MS,
	type ProgressStatusDwell
} from './_progressStatusDwell.ts'
import {
	clampProgress,
	DEFAULT_PROGRESS_TRANSITION_SPEED,
	ProgressRingRenderer,
	type ProgressRingRenderConfig
} from './_progressRingRenderer.ts'
import type { GooProgressRingProps } from './types.ts'

let root: HTMLDivElement | undefined = $state()
let canvasEl: HTMLCanvasElement | undefined = $state()
let renderer: ProgressRingRenderer | undefined

let {
	arcCap = 'round',
	progress = 0,
	size,
	thickness,
	color,
	showText = true,
	label = 'Progress',
	caption,
	minimumCaptionDurationMs = DEFAULT_PROGRESS_STATUS_DWELL_MS,
	indeterminate = false,
	fadeOnComplete = true,
	onFadeComplete,
	variant = 'basic',
	role = 'progressbar',
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	class: className = '',
	style,
	...rest
}: GooProgressRingProps = $props()

let displayedCaption = $state(untrack(() => caption ?? ''))
let captionDwell: ProgressStatusDwell | undefined
let captionDwellDuration = -1

const normalizedProgress = $derived(clampProgress(progress))
const normalizedSize = $derived(Number.isFinite(size) && Number(size) > 0 ? Number(size) : undefined)
const normalizedThickness = $derived(
	Number.isFinite(thickness) ? Math.max(0, Number(thickness)) : undefined
)
const normalizedCaptionDwellDuration = $derived(
	Number.isFinite(minimumCaptionDurationMs)
		? Math.max(0, Number(minimumCaptionDurationMs))
		: DEFAULT_PROGRESS_STATUS_DWELL_MS
)
const complete = $derived(
	!indeterminate
		&& normalizedProgress >= 1
)
const percent = $derived(Math.round(normalizedProgress * 100))
const classes = $derived([ 'goo-progress-ring', className ].filter(Boolean).join(' '))
const resolvedAriaLabelledby = $derived(toAttributeText(ariaLabelledby))
const resolvedAriaLabel = $derived(
	toAttributeText(ariaLabel) ?? (resolvedAriaLabelledby ? undefined : displayedCaption || label)
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

function handleCompletionAnimationEnd(event: AnimationEvent): void {
	if (event.currentTarget !== event.target) return
	if (event.animationName !== 'goo-progress-ring-complete') return
	if (!complete || !fadeOnComplete) return
	onFadeComplete?.()
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
	const nextCaption = caption ?? ''
	const dwellDuration = normalizedCaptionDwellDuration
	if (!captionDwell || captionDwellDuration !== dwellDuration) {
		captionDwell?.destroy()
		captionDwellDuration = dwellDuration
		displayedCaption = nextCaption
		captionDwell = createProgressStatusDwell({
			initialText: nextCaption,
			minimumDurationMs: dwellDuration,
			onTextChange: (text) => {
				displayedCaption = text
			}
		})
	}

	captionDwell.update(nextCaption, normalizedProgress >= 1)
})

$effect(() => {
	const r = ensureRenderer()
	if (!r) return

	r.configure({
		arcCap,
		...(color === undefined ? {} : { fillStyle: color }),
		indeterminate,
		showText,
		...(normalizedThickness === undefined ? {} : { thickness: normalizedThickness }),
		transitionSpeed: DEFAULT_PROGRESS_TRANSITION_SPEED,
		variant
	})
	r.setProgress(normalizedProgress)
})

$effect(() => () => {
	captionDwell?.destroy()
	captionDwell = undefined
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
	data-complete={complete}
	data-fade-on-complete={fadeOnComplete}
	data-indeterminate={indeterminate}
	data-variant={variant}
	onanimationend={handleCompletionAnimationEnd}
>
	<span class="goo-progress-ring__visual" aria-hidden="true">
		<canvas bind:this={canvasEl} aria-hidden="true"></canvas>
	</span>
	{#if displayedCaption}
		<span class="goo-progress-ring__caption" aria-live="polite">{ displayedCaption }</span>
	{/if}
</div>
