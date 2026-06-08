<script lang="ts">
import './GooPreview.css'
import type { GooPreviewProps } from './types.ts'

let {
	ariaLabel,
	alt = '',
	background = 'dots',
	badge,
	class: className = '',
	children,
	fit = 'contain',
	height,
	hue,
	src = '',
	size = 'lg',
	style,
	title,
	...rest
}: GooPreviewProps = $props()

const classes = $derived([
	'goo-preview',
	`goo-preview--${ size }`,
	`goo-preview--background-${ background }`,
	className
].filter(Boolean).join(' '))

const resolvedStyle = $derived([
	style,
	height ? `--goo-preview-height: ${ height }` : '',
	hue ? `--goo-preview-tint: ${ hue }` : '',
	fit ? `--goo-preview-fit: ${ fit }` : ''
].filter(Boolean).join('; '))

const rootRole = $derived(rest.role ?? (ariaLabel ? 'img' : undefined))
const resolvedAriaLabel = $derived(ariaLabel)
</script>

<div
	{...rest}
	class={classes}
	style={resolvedStyle || undefined}
	role={rootRole}
	aria-label={resolvedAriaLabel}
>
	{#if src}
		<img
			class="goo-preview__media"
			{src}
			{alt}
			draggable="false"
		/>
	{:else if children}
		<div class="goo-preview__content">
			{@render children()}
		</div>
	{/if}
	{#if title}
		<span class="goo-preview__title">{title}</span>
	{/if}
	{#if badge}
		<span class="goo-preview__badge">{badge}</span>
	{/if}
</div>
