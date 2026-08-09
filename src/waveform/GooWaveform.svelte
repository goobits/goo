<script lang="ts">
	import './GooWaveform.css'
	import type { GooWaveformBar, GooWaveformProps } from './types.ts'

	let {
		bars = [],
		class: className = '',
		color,
		label,
		progress = null,
		style,
		variant = 'detail',
		...rest
	}: GooWaveformProps = $props()

	const normalizedBars = $derived(
		bars.flatMap((bar): GooWaveformBar[] =>
			Number.isFinite(bar.amplitude)
				? [
						{
							amplitude: Math.max(0, Math.min(1, bar.amplitude)),
							color: bar.color?.trim() || null
						}
					]
				: []
		)
	)
	const normalizedProgress = $derived(
		progress === null || !Number.isFinite(progress)
			? null
			: Math.max(0, Math.min(1, progress))
	)
	const classes = $derived(
		['goo-waveform', `goo-waveform--${variant}`, className].filter(Boolean).join(' ')
	)
	const rootStyle = $derived(
		[style, color ? `--goo-waveform-color:${color}` : ''].filter(Boolean).join(';')
	)
	const rootRole = $derived(rest.role ?? (label ? 'img' : undefined))
	const ariaLabel = $derived(toAttributeText(rest['aria-label'] ?? label))

	function toAttributeText(value: string | number | boolean | null | undefined): string | undefined {
		return value === null || value === undefined ? undefined : String(value)
	}
</script>

<div
	{...rest}
	class={classes}
	style={rootStyle || undefined}
	role={rootRole}
	aria-label={ariaLabel}
	data-waveform-source={normalizedBars.length > 0 ? 'analysis' : 'unavailable'}
	data-progress={normalizedProgress === null ? 'none' : 'determinate'}
>
	{#if normalizedBars.length > 0}
		<svg
			viewBox={`0 0 ${normalizedBars.length} 100`}
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{#each normalizedBars as bar, index (index)}
				{@const height = Math.max(6, bar.amplitude * 94)}
				{@const played =
					normalizedProgress !== null && (index + 1) / normalizedBars.length <= normalizedProgress}
				<rect
					class={normalizedProgress === null
						? 'goo-waveform__bar'
						: played
							? 'goo-waveform__bar goo-waveform__bar--played'
							: 'goo-waveform__bar goo-waveform__bar--remaining'}
					x={index + 0.14}
					y={(100 - height) / 2}
					width="0.72"
					height={height}
					rx="0.36"
					style:fill={bar.color ?? undefined}
					data-played={normalizedProgress === null ? undefined : String(played)}
				></rect>
			{/each}
		</svg>
	{/if}
</div>
