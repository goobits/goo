<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'

import { type GooFolderElement, type GooFolderOptions } from '../folder/_createFolder.js'
import { addChild, clearChildren, hydrateChildren, removeChild } from '../mixins/ChildContainer.js'
import { clamp } from '../utils/numberUtils.js'
import { createPointerDrag } from '../utils/pointerDrag.js'
import type { GooPanelElement, GooPanelOptions } from './_createPanel.js'
import './GooPanel.css'

type GooPanelProps = GooPanelOptions & {
	children?: Snippet
	element?: GooPanelElement | null
	onelement?: (element: GooPanelElement | null) => void
	createFolder?: (options: GooFolderOptions) => GooFolderElement
}

let {
	title = 'Controls',
	class: className = '',
	className: optionClassName = '',
	style = '',
	open = $bindable(true),
	closed,
	draggable,
	collapsible = true,
	showHeader = true,
	docked = false,
	position = 'top-right',
	width = 280,
	content,
	onchange,
	children,
	element = $bindable<GooPanelElement | null>(null),
	onelement,
	createFolder
}: GooPanelProps = $props()

let rootEl: HTMLDivElement | undefined = $state()
// The root <div> is augmented with the GooPanel API at runtime (assignApi);
// expose the augmented type while binding the real element type.
const root = $derived(rootEl as GooPanelElement | undefined)
let headerElement: HTMLElement | undefined = $state()
let titleElement: HTMLElement | undefined = $state()
let toggleElement: HTMLElement | undefined = $state()
let contentElement: HTMLElement | undefined = $state()
let apiReady = false
let dragEvent: { detach?: () => void } | undefined
const panelWidth = $derived(docked ? '100%' : `${ width }px`)

function appendContent(target: HTMLElement, nextContent: GooPanelOptions['content']): void {
	if (!nextContent) return
	if (typeof nextContent === 'string') target.innerHTML = nextContent
	else target.appendChild(nextContent)
}

function syncOpenDom(): void {
	root?.classList.toggle('goo-panel--open', open)
	toggleElement?.setAttribute('aria-expanded', String(open))
}

function setOpen(value: boolean, { silent = false }: { silent?: boolean } = {}): void {
	const oldValue = open
	const nextOpen = Boolean(value)
	if (oldValue === nextOpen) return

	open = nextOpen
	syncOpenDom()
	if (!silent && oldValue !== open) {
		onchange?.(open, oldValue)
		root?.dispatchEvent(new CustomEvent('change', { detail: { value: open, oldValue } }))
	}
}

function toggle(): boolean {
	if (collapsible) setOpen(!open)
	return open
}

function assignApi(): void {
	if (!root) return
	if (!apiReady) {
		root._controllers = []
		root._folders = []
		root._pendingChildren = []
		Object.defineProperties(root, {
			$header: { configurable: true, get: () => headerElement ?? null },
			$title: { configurable: true, get: () => titleElement ?? null },
			$toggle: { configurable: true, get: () => toggleElement ?? null },
			$content: { configurable: true, get: () => contentElement ?? null },
			open: { configurable: true, get: () => open, set: (value: boolean) => setOpen(value) },
			closed: { configurable: true, get: () => !open, set: (value: boolean) => setOpen(!value) },
			title: { configurable: true, get: () => title, set: (value: string) => title = value },
			width: { configurable: true, get: () => width, set: (value: number) => width = value },
			docked: { configurable: true, get: () => docked, set: (value: boolean) => docked = value },
			content: { configurable: true, get: () => contentElement ?? null },
			domElement: { configurable: true, get: () => root },
			controllers: { configurable: true, get: () => root?._controllers ?? [] },
			folders: { configurable: true, get: () => root?._folders ?? [] }
		})
		root.setOpen = setOpen
		root.toggle = toggle
		root.expand = () => setOpen(true)
		root.collapse = () => setOpen(false)
		root.close = () => setOpen(false)
		root.add = child => addChild(root, child)
		root.addContent = child => root.add(child)
		root.addFolder = (folderTitle, folderOptions = {}) => {
			const folder = createFolder?.({ title: folderTitle, ...folderOptions })
			if (!folder) throw new Error('GooPanel addFolder requires a folder factory')
			root.add(folder)
			return folder
		}
		root.removeElement = child => removeChild(root, child)
		root.clear = () => clearChildren(root)
		root.destroy = () => {
			root.clear()
			root.remove()
		}
		apiReady = true
	}
	element = root
	syncOpenDom()
	onelement?.(root)
}

function mountDrag(): void {
	if (!root || !headerElement || docked || draggable === false) return
	dragEvent = createPointerDrag(headerElement, event => {
		const env = event.env
		if (event.START) {
			root?.classList.add('goo-panel--dragging')
			const rect = root.getBoundingClientRect()
			env.startX = rect.left
			env.startY = rect.top
			root.style.position = 'fixed'
			root.style.top = `${ env.startY }px`
			root.style.left = `${ env.startX }px`
			root.style.right = 'auto'
			root.style.bottom = 'auto'
			root.classList.remove(
				'goo-panel--top-right',
				'goo-panel--top-left',
				'goo-panel--bottom-right',
				'goo-panel--bottom-left'
			)
		}
		if (event.DOWN) {
			const rect = root.getBoundingClientRect()
			const maxX = window.innerWidth - rect.width
			const maxY = window.innerHeight - rect.height
			root.style.left = `${ clamp(Number(env.startX ?? 0) + event.x, 0, maxX) }px`
			root.style.top = `${ clamp(Number(env.startY ?? 0) + event.y, 0, maxY) }px`
		}
		if (event.END) root?.classList.remove('goo-panel--dragging')
	})
}

let mountedRoot: GooPanelElement | undefined

$effect(() => {
	const nextRoot = root
	const nextContent = contentElement
	if (!nextRoot || !nextContent || mountedRoot === nextRoot) return
	mountedRoot = nextRoot
	untrack(() => {
		appendContent(nextContent, content)
		hydrateChildren(nextRoot)
		assignApi()
		mountDrag()
	})
	return () => {
		dragEvent?.detach?.()
		onelement?.(null)
		element = null
		if (mountedRoot === nextRoot) mountedRoot = undefined
	}
})

$effect(assignApi)

$effect(() => {
	// Apply the `closed` prop only when it actually changes; reading `open`
	// reactively here would let user/external toggles re-trigger and revert it.
	const nextClosed = closed
	if (nextClosed === undefined) return
	untrack(() => setOpen(!nextClosed, { silent: true }))
})
</script>

<div
	bind:this={rootEl}
	class={`goo-panel ${className} ${optionClassName}`.trim()}
	style={style || undefined}
	class:goo-panel--open={open}
	class:goo-panel--headerless={!showHeader}
	class:goo-panel--docked={docked}
	class:goo-panel--top-right={!docked && position === 'top-right'}
	class:goo-panel--top-left={!docked && position === 'top-left'}
	class:goo-panel--bottom-right={!docked && position === 'bottom-right'}
	class:goo-panel--bottom-left={!docked && position === 'bottom-left'}
	title={title}
	style:--goo-panel-width={panelWidth}
>
	{#if showHeader}
		<div bind:this={headerElement} class="goo-panel__header">
			<div bind:this={titleElement} class="goo-panel__title">{title}</div>
			{#if collapsible}
				<button
					bind:this={toggleElement}
					class="goo-panel__toggle"
					type="button"
					aria-expanded={open}
					aria-label="Toggle panel"
					onclick={toggle}
				>
					<svg class="goo-panel__toggle-icon" width="12" height="12" viewBox="0 0 12 12">
						<path d="M2 4L6 8L10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}
		</div>
	{/if}
	<div bind:this={contentElement} class="goo-panel__content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
