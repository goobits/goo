<script lang="ts">
	import { tick } from 'svelte'
	import './GooChevronTabs.css'
	import type {
		GooChevronDropTargetAttributes,
		GooChevronTab,
		GooChevronTabAttributes
	} from './types.ts'

	let {
		tabs = [],
		activeId = null,
		addLabel = 'Add tab',
		renameLabel = 'Rename tab',
		allowClosingLastTab = false,
		closeLabel = (tab: GooChevronTab) => `Close ${tab.name}`,
		tabAttributes = () => ({}),
		dropTargetAttributes = () => ({}),
		onselect,
		onadd,
		onclose,
		onrename,
		onmove,
		...restProps
	}: {
		tabs?: GooChevronTab[]
		activeId?: string | null
		addLabel?: string
		renameLabel?: string
		allowClosingLastTab?: boolean
		closeLabel?: (_tab: GooChevronTab) => string
		tabAttributes?: (_tab: GooChevronTab, _index: number) => GooChevronTabAttributes
		dropTargetAttributes?: (_index: number) => GooChevronDropTargetAttributes
		onselect?: (_tabId: string) => void
		onadd?: () => void
		onclose?: (_tabId: string) => void
		onrename?: (_tabId: string, _name: string) => void
		onmove?: (_tabId: string, _targetIndex: number) => void
	} & Record<string, unknown> = $props()

	let editingId = $state<string | null>(null)
	let editingName = $state('')
	let draggedId = $state<string | null>(null)
	let dropIndex = $state<number | null>(null)
	let railElement = $state<HTMLElement | null>(null)
	let editingInput = $state<HTMLInputElement | null>(null)

	const activeIndex = $derived(Math.max(0, tabs.findIndex((tab) => tab.id === activeId)))

	const cssEscape = (value: string): string =>
		globalThis.CSS?.escape?.(value) ?? value.replace(/["\\]/g, '\\$&')

	const selectTabAt = (index: number): void => {
		const tab = tabs[index]
		if (tab) onselect?.(tab.id)
	}

	const startRename = (tab: GooChevronTab): void => {
		editingId = tab.id
		editingName = tab.name
	}

	const finishRename = (): void => {
		const tabId = editingId
		const name = editingName.trim()
		editingId = null
		editingName = ''
		if (tabId && name) onrename?.(tabId, name)
	}

	const cancelRename = (): void => {
		editingId = null
		editingName = ''
	}

	const closeTab = (tab: GooChevronTab): void => {
		if (!allowClosingLastTab && tabs.length <= 1) return
		onclose?.(tab.id)
	}

	const statusLabel = (status: GooChevronTab['status']): string | null => {
		if (status === 'working') return 'Agent working'
		if (status === 'done') return 'Agent done'
		if (status === 'needsAttention') return 'Agent needs attention'
		if (status === 'connecting') return 'Connecting'
		if (status === 'connected') return 'Connected'
		if (status === 'disconnected') return 'Disconnected'
		return null
	}

	const moveDraggedTab = (targetIndex: number): void => {
		if (!draggedId) return
		const sourceIndex = tabs.findIndex((tab) => tab.id === draggedId)
		const adjustedIndex = sourceIndex >= 0 && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
		if (sourceIndex >= 0 && sourceIndex !== adjustedIndex) onmove?.(draggedId, adjustedIndex)
		draggedId = null
		dropIndex = null
	}

	const handleTabKeydown = (event: KeyboardEvent, tab: GooChevronTab): void => {
		if (editingId) return
		if (event.key === 'ArrowRight') {
			event.preventDefault()
			selectTabAt((activeIndex + 1) % Math.max(tabs.length, 1))
			return
		}
		if (event.key === 'ArrowLeft') {
			event.preventDefault()
			selectTabAt((activeIndex - 1 + tabs.length) % Math.max(tabs.length, 1))
			return
		}
		if (event.key === 'Home') {
			event.preventDefault()
			selectTabAt(0)
			return
		}
		if (event.key === 'End') {
			event.preventDefault()
			selectTabAt(tabs.length - 1)
			return
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault()
			closeTab(tab)
		}
	}

	$effect(() => {
		const tabId = activeId
		const rail = railElement
		tabs.length
		if (!tabId || !rail) return
		void tick().then(() => {
			if (!rail.isConnected) return
			const selector = `[data-goo-chevron-tab-id="${cssEscape(tabId)}"]`
			const tab = rail.querySelector<HTMLElement>(selector)
			if (!tab) return
			const visibleInset = 44
			const tabLeft = tab.offsetLeft
			const tabRight = tabLeft + tab.offsetWidth
			const visibleLeft = rail.scrollLeft
			const visibleRight = rail.scrollLeft + rail.clientWidth - visibleInset
			if (tabRight > visibleRight) rail.scrollLeft += tabRight - visibleRight
			if (tabLeft < visibleLeft) rail.scrollLeft = tabLeft
		})
	})

	$effect(() => {
		const input = editingInput
		if (!editingId || !input) return
		void tick().then(() => {
			if (input.isConnected) input.focus()
		})
	})
</script>

<div class="goo-chevron-tabs" {...restProps}>
	<div class="goo-chevron-tabs__rail" role="tablist" bind:this={railElement}>
		{#each tabs as tab, index (tab.id)}
			<div
				class="goo-chevron-tabs__drop-target"
				class:goo-chevron-tabs__drop-target--active={dropIndex === index}
				role="presentation"
				{...dropTargetAttributes(index)}
				ondragover={(event) => {
					event.preventDefault()
					dropIndex = index
				}}
				ondrop={(event) => {
					event.preventDefault()
					moveDraggedTab(index)
				}}
			></div>
			<div
				class="goo-chevron-tabs__tab"
				class:goo-chevron-tabs__tab--active={tab.id === activeId}
				class:goo-chevron-tabs__tab--dragging={draggedId === tab.id}
				role="tab"
				aria-selected={tab.id === activeId ? 'true' : 'false'}
				tabindex={tab.id === activeId ? 0 : -1}
				draggable="true"
				data-goo-chevron-tab-id={tab.id}
				style:--goo-chevron-tab-accent={tab.accent ?? '#79f2b0'}
				{...tabAttributes(tab, index)}
				onclick={() => onselect?.(tab.id)}
				ondblclick={() => startRename(tab)}
				onkeydown={(event) => handleTabKeydown(event, tab)}
				ondragstart={() => {
					draggedId = tab.id
				}}
				ondragend={() => {
					draggedId = null
					dropIndex = null
				}}
			>
				<span class="goo-chevron-tabs__divider" aria-hidden="true"></span>
				<span
					class="goo-chevron-tabs__status"
					data-status={tab.status ?? 'idle'}
					role={statusLabel(tab.status) ? 'img' : undefined}
					aria-label={statusLabel(tab.status) ?? undefined}
					title={statusLabel(tab.status) ?? undefined}
				></span>
				{#if editingId === tab.id}
					<input
						class="goo-chevron-tabs__rename"
						aria-label={renameLabel}
						bind:value={editingName}
						bind:this={editingInput}
						onclick={(event) => event.stopPropagation()}
						onkeydown={(event) => {
							if (event.key === 'Enter') finishRename()
							if (event.key === 'Escape') cancelRename()
						}}
						onblur={finishRename}
					/>
				{:else}
					<span class="goo-chevron-tabs__name">{tab.name}</span>
					{#if tab.statusUser}
						<span class="goo-chevron-tabs__user">{tab.statusUser}</span>
					{/if}
				{/if}
				<button
					class="goo-chevron-tabs__close"
					type="button"
					aria-label={closeLabel(tab)}
					onclick={(event) => {
						event.stopPropagation()
						closeTab(tab)
					}}
				>
					x
				</button>
			</div>
		{/each}
		<div
			class="goo-chevron-tabs__drop-target goo-chevron-tabs__drop-target--end"
			class:goo-chevron-tabs__drop-target--active={dropIndex === tabs.length}
			role="presentation"
			{...dropTargetAttributes(tabs.length)}
			ondragover={(event) => {
				event.preventDefault()
				dropIndex = tabs.length
			}}
			ondrop={(event) => {
				event.preventDefault()
				moveDraggedTab(tabs.length)
			}}
		></div>
		<button class="goo-chevron-tabs__add" type="button" aria-label={addLabel} onclick={onadd}>
			+
		</button>
	</div>
</div>
