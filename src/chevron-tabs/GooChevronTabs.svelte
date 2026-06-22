<script lang="ts">
	import Bell from '@lucide/svelte/icons/bell'
	import Bot from '@lucide/svelte/icons/bot'
	import ChevronDown from '@lucide/svelte/icons/chevron-down'
	import CircleAlert from '@lucide/svelte/icons/circle-alert'
	import Plus from '@lucide/svelte/icons/plus'
	import X from '@lucide/svelte/icons/x'
	import { tick } from 'svelte'
	import './GooChevronTabs.css'
	import type {
		GooChevronDropTargetAttributes,
		GooChevronTab,
		GooChevronTabAttributes,
		GooChevronTabStatus
	} from './types.ts'

	type DragState = {
		id: string
		startX: number
		moved: boolean
		pointerId: number
		captured: boolean
	}

	const statusInfo: Record<
		GooChevronTabStatus | 'idle',
		{ dot: string; glow: string; text: string }
	> = {
		idle: { dot: '#50fa7b', glow: 'rgba(80, 250, 123, 0.72)', text: 'connected' },
		connected: { dot: '#50fa7b', glow: 'rgba(80, 250, 123, 0.72)', text: 'connected' },
		connecting: { dot: '#ffb86c', glow: 'rgba(255, 184, 108, 0.82)', text: 'connecting' },
		disconnected: { dot: '#ff5555', glow: 'rgba(255, 85, 85, 0.82)', text: 'disconnected' },
		working: { dot: '#8be9fd', glow: 'rgba(139, 233, 253, 0.78)', text: 'working' },
		done: { dot: '#f1fa8c', glow: 'rgba(241, 250, 140, 0.72)', text: 'done' },
		needsAttention: {
			dot: '#ff79c6',
			glow: 'rgba(255, 121, 198, 0.78)',
			text: 'needs attention'
		}
	}

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
	let listOpen = $state(false)
	let hasOverflow = $state(false)
	let closePressId = $state<string | null>(null)
	let suppressCloseClickId = $state<string | null>(null)
	let draggedId = $state<string | null>(null)
	let dragVisualOffset = $state(0)
	let dragInsertion = $state(0)
	let dragOriginalIds = $state<string[] | null>(null)
	let railElement = $state<HTMLElement | null>(null)
	const tabElements: Record<string, HTMLElement> = {}
	const nameElements: Record<string, HTMLElement> = {}

	let drag: DragState | null = null
	let dragCenters: Record<string, number> = {}
	let dragAdvance = 0
	let editOriginal = ''
	let editCanceled = false

	const setTabElement = (node: HTMLElement, tabId: string) => {
		tabElements[tabId] = node
		return {
			destroy: () => {
				if (tabElements[tabId] === node) delete tabElements[tabId]
			}
		}
	}

	const setNameElement = (node: HTMLElement, tabId: string) => {
		nameElements[tabId] = node
		return {
			destroy: () => {
				if (nameElements[tabId] === node) delete nameElements[tabId]
			}
		}
	}

	const activeIndex = $derived(Math.max(0, tabs.findIndex((tab) => tab.id === activeId)))
	const activeTab = $derived(tabs.find((tab) => tab.id === activeId) ?? tabs[0] ?? null)
	const activeStatus = $derived(activeTab?.status ?? 'connected')
	const activeStatusInfo = $derived(statusInfo[activeStatus ?? 'idle'])
	const activeStatusUser = $derived(activeTab?.statusUser ?? 'shell')
	const dragOrder = $derived.by(() => {
		if (!draggedId || !dragOriginalIds) return null
		const order = dragOriginalIds.filter((id) => id !== draggedId)
		order.splice(dragInsertion, 0, draggedId)
		return order
	})

	const cssEscape = (value: string): string =>
		globalThis.CSS?.escape?.(value) ?? value.replace(/["\\]/g, '\\$&')

	const tabAccent = (tab: GooChevronTab): string => tab.accent ?? '#79f2b0'

	const tabActivity = (
		tab: GooChevronTab
	): { kind: 'working' | 'done' | 'needsAttention'; label: string } | null => {
		if (tab.status === 'working') return { kind: 'working', label: `${tab.name} agent working` }
		if (tab.status === 'done') return { kind: 'done', label: `${tab.name} agent done` }
		if (tab.status === 'needsAttention') {
			return { kind: 'needsAttention', label: `${tab.name} needs attention` }
		}
		return null
	}

	const canCloseTab = (): boolean => allowClosingLastTab || tabs.length > 1

	const selectTabAt = (index: number): void => {
		const tab = tabs[index]
		if (tab) onselect?.(tab.id)
	}

	const closeTab = (tab: GooChevronTab): void => {
		if (!canCloseTab()) return
		onclose?.(tab.id)
	}

	const armClose = (tabId: string): void => {
		closePressId = tabId
	}

	const disarmClose = (): void => {
		closePressId = null
	}

	const confirmClose = (tab: GooChevronTab): void => {
		if (closePressId !== tab.id) return
		closePressId = null
		suppressCloseClickId = tab.id
		closeTab(tab)
	}

	const startRename = (tab: GooChevronTab): void => {
		editOriginal = tab.name
		editCanceled = false
		editingId = tab.id
		void tick().then(() => {
			const element = nameElements[tab.id]
			if (!element?.isConnected) return
			element.focus()
			const range = document.createRange()
			range.selectNodeContents(element)
			const selection = window.getSelection()
			selection?.removeAllRanges()
			selection?.addRange(range)
		})
	}

	const commitRename = (tab: GooChevronTab, element: HTMLElement): void => {
		if (editCanceled) {
			editCanceled = false
			element.textContent = editOriginal
			editingId = null
			return
		}
		const name = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 32)
		editingId = null
		if (name) onrename?.(tab.id, name)
	}

	const handleRenameKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			event.preventDefault()
			;(event.currentTarget as HTMLElement).blur()
		}
		if (event.key === 'Escape') {
			event.preventDefault()
			editCanceled = true
			;(event.currentTarget as HTMLElement).blur()
		}
	}

	const tabTransform = (tab: GooChevronTab): string => {
		if (!draggedId || !dragOrder || !dragOriginalIds) return 'translateX(0px)'
		if (tab.id === draggedId) return `translateX(${dragVisualOffset}px)`
		const originalIndex = dragOriginalIds.indexOf(tab.id)
		const finalIndex = dragOrder.indexOf(tab.id)
		return `translateX(${(finalIndex - originalIndex) * dragAdvance}px)`
	}

	const beginDrag = (event: PointerEvent, tab: GooChevronTab): void => {
		if (editingId === tab.id || event.button !== 0) return
		drag = {
			id: tab.id,
			startX: event.clientX,
			moved: false,
			pointerId: event.pointerId,
			captured: false
		}
	}

	const startDragMove = (event: PointerEvent): boolean => {
		if (!drag) return false
		if (Math.abs(event.clientX - drag.startX) < 4) return false
		drag.moved = true
		railElement?.setPointerCapture?.(drag.pointerId)
		drag.captured = true
		const ids = tabs.map((tab) => tab.id)
		dragOriginalIds = ids
		dragCenters = {}
		for (const id of ids) {
			const rect = tabElements[id]?.getBoundingClientRect()
			if (rect) dragCenters[id] = rect.left + rect.width / 2
		}
		dragAdvance = Math.max(1, (tabElements[drag.id]?.getBoundingClientRect().width ?? 0) - 7)
		draggedId = drag.id
		dragVisualOffset = 0
		dragInsertion = Math.max(0, ids.indexOf(drag.id))
		return true
	}

	const rubberBand = (over: number): number => {
		const distance = dragAdvance * 4
		const constant = 0.55
		return (over * distance * constant) / (distance + constant * over)
	}

	const handlePointerMove = (event: PointerEvent): void => {
		if (!drag) return
		if (!drag.moved && !startDragMove(event)) return
		if (!dragOriginalIds) return
		const offset = event.clientX - drag.startX
		const draggedCenter = (dragCenters[drag.id] ?? drag.startX) + offset
		const otherIds = dragOriginalIds.filter((id) => id !== drag?.id)
		const otherCenters = otherIds.map((id) => dragCenters[id] ?? 0)
		const insertion = otherCenters.filter((center) => draggedCenter > center).length
		const centers = dragOriginalIds.map((id) => dragCenters[id] ?? draggedCenter)
		const minCenter = Math.min(...centers)
		const maxCenter = Math.max(...centers)
		let visualCenter = draggedCenter
		if (draggedCenter < minCenter) visualCenter = minCenter - rubberBand(minCenter - draggedCenter)
		if (draggedCenter > maxCenter) visualCenter = maxCenter + rubberBand(draggedCenter - maxCenter)
		dragVisualOffset = visualCenter - (dragCenters[drag.id] ?? drag.startX)
		dragInsertion = insertion
	}

	const resetDrag = (): void => {
		drag = null
		draggedId = null
		dragOriginalIds = null
		dragVisualOffset = 0
		dragInsertion = 0
	}

	const finishDrag = (): void => {
		if (!drag) return
		if (drag.captured) railElement?.releasePointerCapture?.(drag.pointerId)
		if (!drag.moved) {
			onselect?.(drag.id)
			resetDrag()
			return
		}
		const tabId = drag.id
		const beforeLeft = tabElements[tabId]?.getBoundingClientRect().left ?? 0
		const insertion = dragInsertion
		resetDrag()
		onmove?.(tabId, insertion)
		requestAnimationFrame(() => {
			const element = tabElements[tabId]
			if (!element) return
			const offset = beforeLeft - element.getBoundingClientRect().left
			if (Math.abs(offset) < 0.5) return
			element.style.transition = 'none'
			element.style.transform = `translateX(${offset}px)`
			element.getBoundingClientRect()
			element.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
			element.style.transform = 'translateX(0px)'
			window.setTimeout(() => {
				const nextElement = tabElements[tabId]
				if (!nextElement) return
				nextElement.style.transition = ''
				nextElement.style.transform = ''
			}, 340)
		})
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
		if (event.key === 'F2') {
			event.preventDefault()
			startRename(tab)
			return
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			onselect?.(tab.id)
			return
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault()
			closeTab(tab)
		}
	}

	const scrollActiveIntoView = (): void => {
		const rail = railElement
		const tab = activeId ? tabElements[activeId] : null
		if (!rail || !tab) return
		const railRect = rail.getBoundingClientRect()
		const tabRect = tab.getBoundingClientRect()
		if (tabRect.left < railRect.left + 10) {
			rail.scrollBy({ left: tabRect.left - railRect.left - 10, behavior: 'smooth' })
		} else if (tabRect.right > railRect.right - 10) {
			rail.scrollBy({ left: tabRect.right - railRect.right + 10, behavior: 'smooth' })
		}
	}

	$effect(() => {
		const rail = railElement
		tabs.length
		if (!rail) return
		const measure = (): void => {
			hasOverflow = rail.scrollWidth > rail.clientWidth + 4
		}
		const frame = requestAnimationFrame(measure)
		const timer = window.setTimeout(measure, 660)
		rail.addEventListener('transitionend', measure)
		window.addEventListener('resize', measure)
		return () => {
			cancelAnimationFrame(frame)
			window.clearTimeout(timer)
			rail.removeEventListener('transitionend', measure)
			window.removeEventListener('resize', measure)
		}
	})

	$effect(() => {
		activeId
		tabs.length
		requestAnimationFrame(scrollActiveIntoView)
	})

	$effect(() => {
		if (!listOpen || activeId) return
		listOpen = false
	})
</script>

<div class="goo-chevron-tabs" {...restProps}>
	<div
		class="goo-chevron-tabs__rail"
		class:goo-chevron-tabs__rail--dragging={draggedId !== null}
		role="tablist"
		aria-label="Shell tabs"
		tabindex="-1"
		bind:this={railElement}
		onpointermove={handlePointerMove}
		onpointerup={finishDrag}
		onpointercancel={resetDrag}
	>
		<button class="goo-chevron-tabs__add" type="button" aria-label={addLabel} onclick={onadd}>
			<Plus size={15} strokeWidth={2} aria-hidden="true" />
		</button>

		{#each tabs as tab, index (tab.id)}
			{@const activity = tabActivity(tab)}
			<div
				class="goo-chevron-tabs__tab"
				class:goo-chevron-tabs__tab--active={tab.id === activeId}
				class:goo-chevron-tabs__tab--dragging={draggedId === tab.id}
				class:goo-chevron-tabs__tab--has-activity={activity !== null && editingId !== tab.id}
				role="tab"
				aria-selected={tab.id === activeId ? 'true' : 'false'}
				tabindex={tab.id === activeId ? 0 : -1}
				data-goo-chevron-tab-id={tab.id}
				style:--goo-chevron-tab-accent={tabAccent(tab)}
				style:z-index={tab.id === draggedId ? 1000 : tabs.length - index}
				style:transform={tabTransform(tab)}
				use:setTabElement={tab.id}
				{...tabAttributes(tab, index)}
				{...dropTargetAttributes(index)}
				onclick={() => {
					if (editingId !== tab.id) onselect?.(tab.id)
				}}
				onpointerdown={(event) => beginDrag(event, tab)}
				ondblclick={() => startRename(tab)}
				onkeydown={(event) => handleTabKeydown(event, tab)}
			>
				<span
					class="goo-chevron-tabs__name"
					class:goo-chevron-tabs__name--hidden={editingId === tab.id}
				>
					{tab.name}
				</span>
				{#if editingId === tab.id}
					<span
						class="goo-chevron-tabs__name goo-chevron-tabs__name--editing"
						use:setNameElement={tab.id}
						contenteditable="true"
						role="textbox"
						tabindex="-1"
						spellcheck="false"
						aria-label={renameLabel}
						onpointerdown={(event) => event.stopPropagation()}
						onkeydown={handleRenameKeydown}
						onblur={(event) => commitRename(tab, event.currentTarget)}
					>
						{tab.name}
					</span>
				{/if}

				{#if activity && editingId !== tab.id}
					<span
						class="goo-chevron-tabs__activity"
						class:goo-chevron-tabs__activity--working={activity.kind === 'working'}
						class:goo-chevron-tabs__activity--done={activity.kind === 'done'}
						class:goo-chevron-tabs__activity--needs-attention={activity.kind === 'needsAttention'}
						aria-label={activity.label}
						title={activity.label}
					>
						{#if activity.kind === 'working'}
							<Bot size={12} strokeWidth={2.2} aria-hidden="true" />
						{:else if activity.kind === 'done'}
							<Bell size={12} strokeWidth={2.2} aria-hidden="true" />
						{:else}
							<CircleAlert size={12} strokeWidth={2.2} aria-hidden="true" />
						{/if}
					</span>
				{/if}

				{#if canCloseTab() && editingId !== tab.id}
					<button
						class="goo-chevron-tabs__close"
						class:goo-chevron-tabs__close--pressed={closePressId === tab.id}
						type="button"
						aria-label={closeLabel(tab)}
						title={closeLabel(tab)}
						onpointerdown={(event) => {
							event.stopPropagation()
							armClose(tab.id)
						}}
						onpointerup={(event) => {
							event.stopPropagation()
							confirmClose(tab)
						}}
						onpointerleave={disarmClose}
						onclick={(event) => {
							event.stopPropagation()
							if (suppressCloseClickId === tab.id) {
								suppressCloseClickId = null
								return
							}
							closeTab(tab)
						}}
						onkeydown={(event) => event.stopPropagation()}
					>
						<X size={12} strokeWidth={2.2} aria-hidden="true" />
					</button>
				{/if}
			</div>
		{/each}
	</div>

	<div class="goo-chevron-tabs__right">
		{#if activeTab}
			<div class="goo-chevron-tabs__conn" title="">
				<span
					class="goo-chevron-tabs__conn-dot"
					class:goo-chevron-tabs__conn-dot--pulsing={activeStatus === 'connecting'}
					style:background={activeStatusInfo.dot}
					style:box-shadow={`0 0 7px ${activeStatusInfo.glow}`}
				></span>
				{#if activeStatus !== 'connected'}
					<span class="goo-chevron-tabs__conn-state" style:color={activeStatusInfo.dot}>
						{activeStatusInfo.text}
					</span>
				{/if}
				<div class="goo-chevron-tabs__conn-tip">
					<div class="goo-chevron-tabs__conn-tip-user">{activeStatusUser}</div>
					<div class="goo-chevron-tabs__conn-tip-state">
						<span
							class="goo-chevron-tabs__conn-tip-dot"
							style:background={activeStatusInfo.dot}
						></span>
						<span style:color={activeStatusInfo.dot}>{activeStatusInfo.text}</span>
					</div>
				</div>
			</div>
		{/if}

		{#if hasOverflow}
			<button
				class="goo-chevron-tabs__overflow"
				class:goo-chevron-tabs__overflow--open={listOpen}
				type="button"
				aria-label="All sessions"
				aria-expanded={listOpen}
				title="All sessions"
				onclick={() => {
					listOpen = !listOpen
				}}
			>
				<ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
			</button>
		{/if}
	</div>

	{#if listOpen}
		<div
			class="goo-chevron-tabs__menu-backdrop"
			role="presentation"
			onclick={() => {
				listOpen = false
			}}
		></div>
		<div class="goo-chevron-tabs__menu" role="menu" aria-label="Sessions">
			{#each tabs as tab (tab.id)}
				{@const menuStatus = statusInfo[tab.status ?? 'connected']}
				<button
					class="goo-chevron-tabs__menu-row"
					class:goo-chevron-tabs__menu-row--active={tab.id === activeId}
					type="button"
					role="menuitem"
					onclick={() => {
						onselect?.(tab.id)
						listOpen = false
					}}
				>
					<span
						class="goo-chevron-tabs__menu-accent"
						style:background={tabAccent(tab)}
					></span>
					<span class="goo-chevron-tabs__menu-name">{tab.name}</span>
					<span
						class="goo-chevron-tabs__menu-status"
						style:background={menuStatus.dot}
						title={menuStatus.text}
					></span>
				</button>
			{/each}
		</div>
	{/if}
</div>
