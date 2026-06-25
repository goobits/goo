<script lang="ts">
	import './GooChevronTabs.css'
	import type { GooChevronTab, GooChevronTabsProps } from './types.ts'

	let {
		tabs,
		activeId = null,
		ariaLabel,
		'aria-label': ariaLabelAttribute,
		addLabel = 'Add tab',
		renameLabel = 'Rename tab',
		allowClosingLastTab = false,
		closeLabel = (tab) => `Close ${tab.name} tab`,
		tabAttributes = () => ({}),
		dropTargetAttributes = () => ({}),
		onselect,
		onadd,
		onclose,
		onrename,
		onmove,
		...rest
	}: GooChevronTabsProps = $props()

	let draggingTabId = $state<string | null>(null)

	const canClose = $derived(allowClosingLastTab || tabs.length > 1)
	const resolvedAriaLabel = $derived(ariaLabel ?? ariaLabelAttribute ?? 'Tabs')

	const tabStyle = (tab: GooChevronTab): string | undefined =>
		tab.accent ? `--goo-chevron-tab-accent: ${tab.accent}` : undefined

	const selectTab = (tab: GooChevronTab): void => {
		onselect?.(tab.id)
	}

	const closeTab = (event: Event, tab: GooChevronTab): void => {
		event.stopPropagation()
		if (!canClose) return
		onclose?.(tab.id)
	}

	const renameTab = (tab: GooChevronTab): void => {
		if (!onrename || typeof window === 'undefined') return
		const nextName = window.prompt(renameLabel, tab.name)?.trim()
		if (nextName && nextName !== tab.name) onrename(tab.id, nextName)
	}

	const handleTabKeydown = (event: KeyboardEvent, tab: GooChevronTab): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			selectTab(tab)
			return
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault()
			if (canClose) onclose?.(tab.id)
		}
	}

	const dragStart = (event: DragEvent, tab: GooChevronTab): void => {
		draggingTabId = tab.id
		event.dataTransfer?.setData('text/plain', tab.id)
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
	}

	const dragOver = (event: DragEvent): void => {
		event.preventDefault()
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
	}

	const dropTab = (event: DragEvent, targetIndex: number): void => {
		event.preventDefault()
		const tabId = event.dataTransfer?.getData('text/plain') || draggingTabId
		draggingTabId = null
		if (tabId) onmove?.(tabId, targetIndex)
	}
</script>

<div {...rest} class="goo-chevron-tabs" role="tablist" aria-label={resolvedAriaLabel}>
	<button class="goo-chevron-tabs__add" type="button" aria-label={addLabel} onclick={onadd}>
		<span aria-hidden="true">+</span>
	</button>
	<div class="goo-chevron-tabs__rail">
		{#if draggingTabId}
			<button
				class="goo-chevron-tabs__drop-target"
				type="button"
				aria-label="Move tab to start"
				{...dropTargetAttributes(0)}
				ondragover={dragOver}
				ondrop={(event) => dropTab(event, 0)}
			></button>
		{/if}
		{#each tabs as tab, index (tab.id)}
			<button
				class="goo-chevron-tabs__tab"
				class:goo-chevron-tabs__tab--active={tab.id === activeId}
				class:goo-chevron-tabs__tab--dragging={tab.id === draggingTabId}
				type="button"
				role="tab"
				aria-selected={tab.id === activeId}
				style={tabStyle(tab)}
				draggable="true"
				{...tabAttributes(tab, index)}
				onclick={() => selectTab(tab)}
				ondblclick={() => renameTab(tab)}
				onkeydown={(event) => handleTabKeydown(event, tab)}
				ondragstart={(event) => dragStart(event, tab)}
				ondragend={() => {
					draggingTabId = null
				}}
			>
				<span class="goo-chevron-tabs__label">{tab.name}</span>
				{#if tab.status}
					<span class="goo-chevron-tabs__status" data-status={tab.status}>
						{tab.statusUser ?? tab.status}
					</span>
				{/if}
				{#if canClose}
					<span
						class="goo-chevron-tabs__close"
						role="button"
						tabindex="-1"
						aria-label={closeLabel(tab)}
						onclick={(event) => closeTab(event, tab)}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') closeTab(event, tab)
						}}
					>
						×
					</span>
				{/if}
			</button>
			{#if draggingTabId}
				<button
					class="goo-chevron-tabs__drop-target"
					type="button"
					aria-label={`Move tab after ${tab.name}`}
					{...dropTargetAttributes(index + 1)}
					ondragover={dragOver}
					ondrop={(event) => dropTab(event, index + 1)}
				></button>
			{/if}
		{/each}
		<span class="goo-chevron-tabs__conn" aria-hidden="true"></span>
	</div>
</div>
