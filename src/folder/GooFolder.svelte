<script module lang="ts">
/** Monotonic counter giving each folder's content region a unique id for `aria-controls`. */
let folderInstanceCount = 0
</script>

<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'

import { addChild, clearChildren, hydrateChildren, removeChild } from '../mixins/ChildContainer.js'
import type { GooFolderElement, GooFolderOptions } from './_createFolder.js'
import './GooFolder.css'

type GooFolderProps = GooFolderOptions & {
	children?: Snippet
	element?: GooFolderElement | null
	onelement?: (element: GooFolderElement | null) => void
	createFolder?: (options: GooFolderOptions) => GooFolderElement
}

let {
	title = '',
	class: className = '',
	className: optionClassName = '',
	style = '',
	open = $bindable(true),
	tabIndex = 0,
	disabled = false,
	content,
	onadd,
	onchange,
	children,
	element = $bindable<GooFolderElement | null>(null),
	onelement,
	createFolder
}: GooFolderProps = $props()

const contentId = `goo-folder-content-${ ++folderInstanceCount }`

let rootEl: HTMLDivElement | undefined = $state()
// The root <div> is augmented with the GooFolder API at runtime (assignApi);
// expose the augmented type while binding the real element type.
const root = $derived(rootEl as GooFolderElement | undefined)
let headerElement: HTMLElement | undefined = $state()
let titleElement: HTMLElement | undefined = $state()
let contentElement: HTMLElement | undefined = $state()
let chevronElement: HTMLElement | undefined = $state()
let apiReady = false

function appendContent(target: HTMLElement, nextContent: GooFolderOptions['content']): void {
	if (!nextContent) return
	if (typeof nextContent === 'string') target.innerHTML = nextContent
	else target.appendChild(nextContent)
}

function syncOpenDom(): void {
	root?.classList.toggle('goo-folder--open', open)
	headerElement?.setAttribute('aria-expanded', String(open))
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
	if (!disabled) setOpen(!open)
	return open
}

function handleHeaderClick(event: MouseEvent): void {
	event.stopPropagation()
	toggle()
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
			$content: { configurable: true, get: () => contentElement ?? null },
			$chevron: { configurable: true, get: () => chevronElement ?? null },
			open: { configurable: true, get: () => open, set: (value: boolean) => setOpen(value) },
			title: { configurable: true, get: () => title, set: (value: string) => title = value },
			content: { configurable: true, get: () => contentElement ?? null },
			controllers: { configurable: true, get: () => root?._controllers ?? [] },
			folders: { configurable: true, get: () => root?._folders ?? [] }
		})
		root.setOpen = setOpen
		root.toggle = toggle
		root.expand = () => setOpen(true)
		root.collapse = () => setOpen(false)
		root.add = child => {
			const result = addChild(root, child)
			onadd?.(child)
			return result
		}
		root.addFolder = (childTitle, childOptions = {}) => {
			const folder = createFolder?.({ title: childTitle, ...childOptions })
			if (!folder) throw new Error('GooFolder addFolder requires a folder factory')
			root.add(folder)
			return folder
		}
		root.removeElement = child => removeChild(root, child)
		root.clear = () => clearChildren(root)
		apiReady = true
	}
	element = root
	syncOpenDom()
	onelement?.(root)
}

let mountedRoot: GooFolderElement | undefined

$effect(() => {
	const nextRoot = root
	const nextContent = contentElement
	if (!nextRoot || !nextContent || mountedRoot === nextRoot) return
	mountedRoot = nextRoot
	untrack(() => {
		appendContent(nextContent, content)
		hydrateChildren(nextRoot)
		assignApi()
	})
	return () => {
		onelement?.(null)
		element = null
		if (mountedRoot === nextRoot) mountedRoot = undefined
	}
})

$effect(assignApi)
</script>

<div
	bind:this={rootEl}
	class={`goo-folder ${className} ${optionClassName}`.trim()}
	style={style || undefined}
	class:goo-folder--open={open}
	class:goo-folder--disabled={disabled}
	role="group"
	aria-label={title || undefined}
	title={title || undefined}
>
	<button
		bind:this={headerElement}
		class="goo-folder__header"
		type="button"
		tabindex={tabIndex}
		disabled={disabled || undefined}
		aria-expanded={open}
		aria-controls={contentId}
		onclick={handleHeaderClick}
	>
		<span bind:this={chevronElement} class="goo-folder__chevron">
			<svg class="goo-folder__chevron-icon" width="12" height="12" viewBox="0 0 12 12">
				<path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</span>
		<span bind:this={titleElement} class="goo-folder__title">{title}</span>
	</button>
	<div bind:this={contentElement} id={contentId} class="goo-folder__content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
