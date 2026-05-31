<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'
import { createGooTooltip } from './tooltip.ts'
import type { GooTooltipActionOptions, GooTooltipInstance } from './tooltip.ts'

type GooTooltipTarget = HTMLElement | string | null | undefined

type GooTooltipProps = GooTooltipActionOptions & {
	/** Target element or element id that owns the tooltip. */
	for?: GooTooltipTarget

	/** Target element or element id that owns the tooltip. */
	target?: GooTooltipTarget

	/** Optional rich tooltip content. */
	children?: Snippet

	/** Bound tooltip instance for imperative show/hide calls. */
	instance?: GooTooltipInstance | null
}

let contentElement: HTMLDivElement | undefined = $state()
let mounted = false
let currentTooltip: GooTooltipInstance | null = null
let lastKey = ''

let {
	for: forTarget,
	target,
	content = '',
	align = 'center bottom to center top',
	offset = { x: 0, y: 8 },
	showDelay = 400,
	hideDelay = 0,
	trigger = 'hover',
	arrow = true,
	interactive = false,
	children,
	instance = $bindable<GooTooltipInstance | null>(null),
	onshow,
	onhide
}: GooTooltipProps = $props()

const resolvedTarget = $derived(target ?? forTarget)

function resolveTargetElement(): HTMLElement | null {
	if (resolvedTarget instanceof HTMLElement) return resolvedTarget
	if (typeof resolvedTarget === 'string') return document.getElementById(resolvedTarget)
	return null
}

function getKey(): string {
	return JSON.stringify({
		target: resolvedTarget instanceof HTMLElement ? resolvedTarget.id : resolvedTarget,
		content,
		align,
		offset,
		showDelay,
		hideDelay,
		trigger,
		arrow,
		interactive,
		hasChildren: Boolean(children)
	})
}

function destroyTooltip(): void {
	currentTooltip?.destroy()
	currentTooltip = null
	instance = null
}

function mountTooltip(): void {
	const targetElement = resolveTargetElement()
	if (!targetElement) return
	destroyTooltip()
	currentTooltip = createGooTooltip({
		for: targetElement,
		content,
		$content: children && contentElement ? contentElement : undefined,
		align,
		offset,
		showDelay,
		hideDelay,
		trigger,
		arrow,
		interactive,
		onshow,
		onhide
	})
	instance = currentTooltip
}

$effect(() => {
	untrack(() => {
		lastKey = getKey()
		mountTooltip()
	})
	mounted = true
	return destroyTooltip
})

$effect(() => {
	const key = getKey()
	if (!mounted || key === lastKey) return
	lastKey = key
	void Promise.resolve().then(mountTooltip)
})
</script>

{#if children}
	<div bind:this={contentElement} hidden>
		{@render children()}
	</div>
{/if}
