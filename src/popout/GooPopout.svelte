<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'
import { createGooPopout } from './popout.ts'
import type { GooPopoutAt, GooPopoutInstance, GooPopoutOptions } from './popout.ts'

type GooPopoutTarget = HTMLElement | string | GooPopoutAt | null | undefined

type GooPopoutProps = Omit<GooPopoutOptions, '$content' | 'at' | 'onOpen' | 'onClose'> & {
	/** Target element, element id, or point configuration for the popout. */
	for?: GooPopoutTarget

	/** Target element, element id, or point configuration for the popout. */
	target?: GooPopoutTarget

	/** Whether the popout starts opened. */
	open?: boolean

	/** Rendered popout content. */
	children?: Snippet

	/** Bound popout instance for imperative open/close calls. */
	instance?: GooPopoutInstance | null

	/** Open callback. */
	onopen?: (data: { $element: HTMLElement; instance: GooPopoutInstance }) => void

	/** Close callback. */
	onclose?: (data: { $element: HTMLElement; instance: GooPopoutInstance }) => void
}

let contentElement: HTMLDivElement | undefined = $state()
let currentPopout: GooPopoutInstance | null = null
let cleanupTrigger: (() => void) | null = null
let mounted = false
let lastKey = ''

let {
	for: forTarget,
	target,
	open = $bindable<boolean | undefined>(undefined),
	align,
	offset,
	keepWithin,
	className = '',
	dataset,
	attributes,
	showArrow = true,
	showBackdrop = false,
	clickToClose = true,
	escapeToClose = true,
	dragToMove = false,
	initialFocus = 'content',
	fullScreen = false,
	ariaLabel = 'Popout',
	children,
	instance = $bindable<GooPopoutInstance | null>(null),
	onopen,
	onclose
}: GooPopoutProps = $props()

const resolvedTarget = $derived(target ?? forTarget)

function resolveTarget(): HTMLElement | GooPopoutAt | null {
	if (resolvedTarget instanceof HTMLElement) return resolvedTarget
	if (typeof resolvedTarget === 'string') return document.getElementById(resolvedTarget)
	if (resolvedTarget && typeof resolvedTarget === 'object') return resolvedTarget
	return null
}

function getTargetId(): string | null {
	if (resolvedTarget instanceof HTMLElement) return resolvedTarget.id || null
	if (typeof resolvedTarget === 'string') return resolvedTarget
	if (resolvedTarget?.element) return resolvedTarget.element.id || null
	return null
}

function getKey(): string {
	return JSON.stringify({
		target: getTargetId(),
		align,
		offset,
		keepWithin,
		className,
		dataset,
		attributes,
		showArrow,
		showBackdrop,
		clickToClose: typeof clickToClose === 'boolean' ? clickToClose : 'function',
		escapeToClose,
		dragToMove,
		initialFocus,
		fullScreen,
		ariaLabel
	})
}

function destroyPopout(): void {
	cleanupTrigger?.()
	cleanupTrigger = null
	currentPopout?.destroy()
	currentPopout = null
	instance = null
}

function mountPopout(): void {
	const at = resolveTarget()
	if (!at || !contentElement) return
	destroyPopout()
	contentElement.dataset.gooPopoutStaged = 'true'
	contentElement.hidden = true
	const targetId = getTargetId()
	currentPopout = createGooPopout({
		$content: contentElement,
		at,
		align,
		offset,
		keepWithin,
		className,
		dataset,
		attributes: {
			...attributes,
			...(targetId ? { for: targetId } : {})
		},
		showArrow,
		showBackdrop,
		clickToClose,
		escapeToClose,
		dragToMove,
		initialFocus,
		fullScreen,
		ariaLabel,
		openImmediately: false,
		onOpen: data => {
			open = true
			onopen?.(data)
		},
		onClose: data => {
			open = false
			onclose?.(data)
		},
		onDestroy: () => {
			if (contentElement) contentElement.hidden = true
		}
	})
	instance = currentPopout

	const targetElement = at instanceof HTMLElement ? at : at.element
	if (targetElement) {
		const toggle = () => currentPopout?.toggle()
		targetElement.addEventListener('click', toggle)
		cleanupTrigger = () => targetElement.removeEventListener('click', toggle)
	}
	if (open) currentPopout.open()
}

$effect(() => {
	untrack(() => {
		lastKey = getKey()
		mountPopout()
	})
	mounted = true
	return destroyPopout
})

$effect(() => {
	const key = getKey()
	if (!mounted || key === lastKey) return
	lastKey = key
	void Promise.resolve().then(mountPopout)
})

$effect(() => {
	if (!mounted || !currentPopout) return
	if (open === undefined) return
	if (open && !currentPopout.opened) currentPopout.open()
	if (!open && currentPopout.opened) currentPopout.close()
})
</script>

<div bind:this={contentElement} hidden>
	{#if children}
		{@render children()}
	{/if}
</div>
