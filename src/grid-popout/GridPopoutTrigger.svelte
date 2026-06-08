<script lang="ts">
/**
 * Shared Goo-styled trigger shell for controls that open a popout.
 */

import ChevronDown from '@lucide/svelte/icons/chevron-down'

import { GooPreview } from '../preview/index.ts'
import type { GridPopoutPreview, GridPopoutSvgIcon } from './types.ts'

const CONTENT_FADE_MS = 140

interface TriggerValue {
	ariaLabel?: string
	iconClass?: string
	iconSvg?: GridPopoutSvgIcon
	kicker?: string
	preview?: GridPopoutPreview
	previewAlt?: string
	previewUrl?: string
	title?: string
}

interface Props {
	ariaLabel?: string
	class?: string
	dataParam?: string
	disabled?: boolean
	id?: string
	iconClass?: string
	iconSvg?: GridPopoutSvgIcon
	kicker?: string
	opened?: boolean
	preview?: GridPopoutPreview
	previewAlt?: string
	previewClass?: string
	previewSize?: number
	previewUrl?: string
	nextPreviewClass?: string
	nextPreviewVisible?: boolean
	nextPreviewUrl?: string
	tabIndex?: number
	title?: string
	onclick?: (event: MouseEvent) => void
	onkeydown?: (event: KeyboardEvent) => void
	onpointerdown?: (event: PointerEvent) => void
	onrootchange?: (element: HTMLElement | null) => void
}

let {
	ariaLabel = 'Open menu',
	class: className = '',
	dataParam,
	disabled = false,
	id,
	iconClass = '',
	iconSvg,
	kicker = '',
	opened = false,
	preview,
	previewAlt = '',
	previewClass = '',
	previewSize = 40,
	previewUrl = '',
	nextPreviewClass = '',
	nextPreviewVisible = false,
	nextPreviewUrl = '',
	tabIndex = 0,
	title = '',
	onclick,
	onkeydown,
	onpointerdown,
	onrootchange
}: Props = $props()

let rootElement = $state<HTMLElement | null>(null)
let openedOverride = $state<boolean | undefined>()
let valueOverride = $state<TriggerValue>({})
let contentFadeActive = $state(false)
let contentFadeTimer: ReturnType<typeof setTimeout> | undefined
let lastContentSignature = ''
const triggerClass = $derived([
	'goo-grid-trigger',
	'goo-grid-trigger--small',
	className
].filter(Boolean).join(' '))
const previewClassName = $derived([
	'icon',
	'goo-grid-trigger__icon',
	'goo-grid-popout-trigger__preview',
	previewClass
].filter(Boolean).join(' '))
const nextPreviewClassName = $derived([
	'icon',
	'goo-grid-trigger__icon',
	'goo-grid-popout-trigger__preview',
	'goo-grid-popout-trigger__preview--next',
	nextPreviewVisible ? 'goo-grid-popout-trigger__preview--visible' : '',
	nextPreviewClass
].filter(Boolean).join(' '))
const currentOpened = $derived(openedOverride ?? opened)
const currentAriaLabel = $derived(valueOverride.ariaLabel ?? ariaLabel)
const currentIconClass = $derived(valueOverride.iconClass ?? iconClass)
const currentIconSvg = $derived(valueOverride.iconSvg ?? iconSvg)
const currentKicker = $derived(valueOverride.kicker ?? kicker)
const currentPreview = $derived(valueOverride.preview ?? preview ?? getLegacyPreview(valueOverride.previewUrl ?? previewUrl, valueOverride.previewAlt ?? previewAlt))
const currentPreviewAlt = $derived(valueOverride.previewAlt ?? previewAlt)
const currentPreviewUrl = $derived(valueOverride.previewUrl ?? previewUrl)
const currentTitle = $derived(valueOverride.title ?? title)
const contentFadeClassName = $derived(contentFadeActive && !currentPreview?.src && !currentPreviewUrl
	? 'goo-grid-popout-trigger__fade'
	: '')
const iconClassName = $derived([
	'icon',
	'goo-grid-trigger__icon',
	'goo-grid-popout-trigger__icon',
	currentIconClass,
	contentFadeClassName
].filter(Boolean).join(' '))
const svgIconClassName = $derived([
	'icon',
	'goo-grid-trigger__icon',
	'goo-grid-popout-trigger__icon',
	currentIconSvg?.class ?? '',
	contentFadeClassName
].filter(Boolean).join(' '))
const titleClassName = $derived(contentFadeClassName)

export function getRootElement(): HTMLElement | null {
	return rootElement
}

export function setOpened(nextOpened: boolean): void {
	openedOverride = nextOpened
}

export function setValue(value: TriggerValue): void {
	valueOverride = { ...valueOverride, ...value }
}

$effect(() => {
	onrootchange?.(rootElement)
})

$effect(() => {
	const contentSignature = [
		currentIconClass,
		currentIconSvg ? JSON.stringify(currentIconSvg) : '',
		currentPreview ? JSON.stringify(currentPreview) : currentPreviewUrl,
		currentKicker,
		currentTitle
	].join('\0')

	if (!lastContentSignature) {
		lastContentSignature = contentSignature
		return
	}

	if (lastContentSignature === contentSignature) return

	lastContentSignature = contentSignature
	playContentFade()
})

$effect(() => {
	return () => clearContentFadeTimer()
})

function playContentFade(): void {
	clearContentFadeTimer()
	contentFadeActive = false
	requestAnimationFrame(() => {
		contentFadeActive = true
		contentFadeTimer = setTimeout(() => {
			contentFadeActive = false
			contentFadeTimer = undefined
		}, CONTENT_FADE_MS)
	})
}

function clearContentFadeTimer(): void {
	if (!contentFadeTimer) return

	clearTimeout(contentFadeTimer)
	contentFadeTimer = undefined
}

function getLegacyPreview(src: string, alt: string): GridPopoutPreview | undefined {
	if (!src) return undefined
	return {
		alt,
		background: 'checker',
		fit: 'contain',
		size: 'sm',
		src
	}
}
</script>

<goo-grid-popout-trigger
	bind:this={rootElement}
	{id}
	class={triggerClass}
	data-param={dataParam}
	class:goo-grid-trigger--opened={currentOpened}
	tabindex={disabled ? -1 : tabIndex}
	role="button"
	aria-label={currentAriaLabel}
	aria-expanded={currentOpened}
	aria-disabled={disabled}
	aria-haspopup="dialog"
	onpointerdown={onpointerdown}
	onclick={onclick}
	onkeydown={onkeydown}
>
	<span class="goo-grid-trigger__arrow">
		<ChevronDown aria-hidden="true" focusable="false" />
	</span>
	<span class="goo-grid-popout-trigger__content">
		<grid-title class={titleClassName}>
			{#if currentKicker}
				<span class="goo-grid-popout-trigger__kicker">{currentKicker}</span>
			{/if}
			<span class="goo-grid-popout-trigger__title">{currentTitle}</span>
		</grid-title>
		{#if currentPreview?.src}
			<GooPreview
				class={previewClassName}
				src={currentPreview.src}
				alt={currentPreview.alt ?? currentPreviewAlt}
				background={currentPreview.background ?? 'checker'}
				badge={currentPreview.badge}
				fit={currentPreview.fit ?? 'contain'}
				hue={currentPreview.hue}
				size={currentPreview.size ?? 'sm'}
			/>
		{:else if currentIconSvg}
			<svg
				class={svgIconClassName}
				viewBox={currentIconSvg.viewBox}
				aria-hidden="true"
				focusable="false"
			>
				{#each currentIconSvg.paths as path}
					<path d={path.d} transform={path.transform} />
				{/each}
			</svg>
		{:else if currentIconClass}
			<span class={iconClassName} aria-hidden="true"></span>
		{/if}
		{#if nextPreviewUrl}
			<img
				class={nextPreviewClassName}
				src={nextPreviewUrl}
				alt=""
				width={previewSize}
				height={previewSize}
				draggable="false"
			/>
		{/if}
	</span>
</goo-grid-popout-trigger>

<style>
goo-grid-popout-trigger {
	--goo-grid-trigger-arrow-size: var(--goo-theme-icon-md, 1rem);
	--goo-grid-trigger-arrow-inline-size: 38px;
	--goo-grid-trigger-icon-inline-size: 50px;
	--goo-grid-trigger-title-inline-start: var(--goo-grid-trigger-icon-inline-size);
	box-sizing: border-box;
	clear: both;
	color: var(--goo-theme-fg);
	cursor: pointer;
	display: block;
	fill: var(--goo-theme-fg);
	height: 4rem;
	inline-size: 100%;
	line-height: 55px;
	outline: none;
	position: relative;
	user-select: none;
	-webkit-user-select: none;
}

goo-grid-popout-trigger:focus::after {
	border-radius: var(--goo-theme-radius-sm);
	box-shadow: inset 0 0 0 1px var(--goo-theme-accent) !important;
	content: "";
	display: block;
	height: 100%;
	left: 0;
	pointer-events: none;
	position: absolute;
	top: 0;
	width: 100%;
	z-index: 2;
}

goo-grid-popout-trigger[aria-disabled="true"] {
	cursor: default;
	opacity: 0.5;
	pointer-events: none;
}

.goo-grid-popout-trigger__content {
	display: contents;
	user-select: none;
	-webkit-user-select: none;
}

goo-grid-popout-trigger :global(grid-title) {
	align-items: center;
	display: flex;
	flex-direction: column;
	color: var(--goo-theme-fg);
	gap: 1px;
	height: 60px;
	justify-content: center;
	inset-inline-start: 65px;
	line-height: 1.2;
	overflow: hidden;
	position: absolute;
	text-overflow: ellipsis;
	top: 50%;
	transform: translateY(-50%);
	white-space: nowrap;
	width: calc(100% - 65px - var(--goo-grid-trigger-arrow-inline-size));
}

.goo-grid-popout-trigger__kicker {
	color: var(--goo-theme-muted);
	font-size: 0.625rem;
	font-weight: 600;
	letter-spacing: 0.07em;
	text-transform: uppercase;
}

.goo-grid-popout-trigger__title {
	color: var(--goo-theme-fg);
	font-size: var(--goo-theme-font-size-sm, 0.8125rem);
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	width: 100%;
}

goo-grid-popout-trigger :global(.icon),
goo-grid-popout-trigger :global(.goo-grid-trigger__icon) {
	font-size: calc(var(--goo-theme-icon-lg, 1.125rem) * 1.7);
	height: 60px !important;
	inset-inline-start: 0;
	line-height: 57px;
	margin-left: 4px;
	object-fit: contain;
	position: absolute;
	text-align: center;
	top: 50%;
	transform: translateY(-50%);
	width: 60px;
}

goo-grid-popout-trigger :global(.icon svg),
goo-grid-popout-trigger :global(.goo-grid-trigger__icon svg) {
	transform: matrix(0.75, 0, 0, 0.75, 0, 2);
}

goo-grid-popout-trigger :global(canvas.icon),
goo-grid-popout-trigger :global(img.icon),
goo-grid-popout-trigger :global(canvas.goo-grid-trigger__icon),
goo-grid-popout-trigger :global(img.goo-grid-trigger__icon) {
	padding: 8px;
}

goo-grid-popout-trigger .goo-grid-trigger__arrow {
	align-items: center;
	display: inline-flex;
	font-size: var(--goo-grid-trigger-arrow-size);
	height: 100%;
	justify-content: center;
	line-height: 1;
	min-width: var(--goo-grid-trigger-arrow-inline-size);
	position: absolute;
	inset-inline-end: 0;
	top: 0;
	transform-origin: center;
	transition: 150ms transform;
	width: var(--goo-grid-trigger-arrow-inline-size);
}

goo-grid-popout-trigger.goo-grid-trigger--opened {
	background: color-mix(in srgb, var(--goo-theme-fg) 15%, transparent);
}

goo-grid-popout-trigger.goo-grid-trigger--bordered {
	border-bottom: 1px solid var(--goo-theme-border);
	border-top: 1px solid color-mix(in srgb, var(--goo-theme-fg) 15%, transparent);
}

goo-grid-popout-trigger .goo-grid-trigger__arrow :global(svg) {
	display: block;
	height: 1em;
	width: 1em;
}

goo-grid-popout-trigger.goo-grid-trigger--opened .goo-grid-trigger__arrow {
	transform: rotate(-90deg);
}

:global([dir="rtl"]) goo-grid-popout-trigger.goo-grid-trigger--opened .goo-grid-trigger__arrow {
	transform: rotate(90deg);
}

:global([dir="rtl"]) goo-grid-popout-trigger :global(.icon),
:global([dir="rtl"]) goo-grid-popout-trigger :global(.goo-grid-trigger__icon) {
	left: auto;
	right: 0;
}

:global([dir="rtl"]) goo-grid-popout-trigger .goo-grid-trigger__arrow {
	left: 0;
	right: auto;
}

:global([dir="rtl"]) goo-grid-popout-trigger :global(grid-title) {
	left: auto;
	right: 60px;
}

goo-grid-popout-trigger.goo-grid-trigger--small {
	align-items: center;
	display: flex;
	height: 4rem;
	line-height: 37px;
}

goo-grid-popout-trigger.goo-grid-trigger--small :global(grid-title) {
	align-items: center;
	display: flex;
	height: 40px;
	inset-inline-start: var(--goo-grid-trigger-title-inline-start);
	line-height: 1.2;
	width: calc(100% - var(--goo-grid-trigger-title-inline-start) - var(--goo-grid-trigger-arrow-inline-size));
}

goo-grid-popout-trigger.goo-grid-trigger--small :global(.icon),
goo-grid-popout-trigger.goo-grid-trigger--small :global(.goo-grid-trigger__icon) {
	font-size: var(--goo-theme-icon-lg, 1.125rem);
	height: 40px !important;
	line-height: 37px;
	margin-left: 8px;
	width: 40px;
}

goo-grid-popout-trigger.goo-grid-trigger--font :global(grid-title) {
	display: none;
}

goo-grid-popout-trigger.goo-grid-trigger--font :global(.icon),
goo-grid-popout-trigger.goo-grid-trigger--font :global(.goo-grid-trigger__icon) {
	width: auto;
}

.goo-grid-popout-trigger__preview {
	border-radius: var(--goo-theme-radius-sm, 0.25rem);
	object-fit: cover;
	transition: opacity 140ms ease-out;
	will-change: opacity;
}

goo-grid-popout-trigger.goo-grid-trigger--preset {
	background: var(--goo-theme-surface-raised, color-mix(in srgb, var(--goo-theme-fg) 5%, var(--goo-theme-bg)));
	border: 1px solid var(--goo-theme-border-strong, var(--goo-theme-border));
	border-radius: var(--goo-theme-radius-lg, 0.5rem);
	height: 2.875rem;
	line-height: 1.2;
	overflow: hidden;
}

goo-grid-popout-trigger.goo-grid-trigger--preset:hover {
	background: var(--goo-theme-bg-hover, color-mix(in srgb, var(--goo-theme-fg) 8%, var(--goo-theme-bg)));
	border-color: var(--goo-theme-border-strong, var(--goo-theme-border));
}

goo-grid-popout-trigger.goo-grid-trigger--preset :global(grid-title) {
	inset-inline-start: 3.125rem;
	width: calc(100% - 3.125rem - var(--goo-grid-trigger-arrow-inline-size));
}

goo-grid-popout-trigger.goo-grid-trigger--preset :global(.goo-grid-popout-trigger__preview) {
	height: 2rem !important;
	margin-left: 0.5rem;
	padding: 0;
	width: 2rem;
}

.goo-grid-popout-trigger__preview--next {
	opacity: 0;
}

.goo-grid-popout-trigger__preview--visible {
	opacity: 1;
}

.goo-grid-popout-trigger__fade {
	animation: goo-grid-popout-trigger-fade 140ms ease-out;
}

@keyframes goo-grid-popout-trigger-fade {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}

@media (prefers-reduced-motion: reduce) {
	goo-grid-popout-trigger .goo-grid-trigger__arrow,
	.goo-grid-popout-trigger__preview {
		transition-duration: 0.01ms;
	}

	.goo-grid-popout-trigger__fade {
		animation-duration: 0.01ms;
	}
}
</style>
