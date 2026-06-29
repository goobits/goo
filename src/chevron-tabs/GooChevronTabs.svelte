<script lang="ts">
	import { BellRing, Bot, ChevronDown, CircleAlert, Plus, X } from '@lucide/svelte'
	import './GooChevronTabs.css'
	import {
		focusFirstMenuItem,
		handleMenuKeyboardEvent
	} from '@goobits/keyboard/composite'
	import {
		containKeyboardEvent,
		isKeyboardActivationKey
	} from '../support/keyboard/_keyboardActivation.ts'
	import type { GooChevronTab, GooChevronTabStatus, GooChevronTabsProps } from './types.ts'
	import {
		hasChevronTabDragIntent,
		resolveChevronTabDragInsertion,
		resolveChevronTabKeyboardTargetIndex
	} from './_chevronTabsModel.ts'

	const statusInfo: Record<
		GooChevronTabStatus | 'idle',
		{ dot: string; glow: string; text: string }
	> = {
		idle: { dot: '#6272a4', glow: 'rgba(98, 114, 164, 0.5)', text: 'idle' },
		connected: { dot: '#50fa7b', glow: 'rgba(80, 250, 123, 0.75)', text: 'connected' },
		connecting: {
			dot: '#ffb86c',
			glow: 'rgba(255, 184, 108, 0.85)',
			text: 'reconnecting...'
		},
		disconnected: {
			dot: '#ff5555',
			glow: 'rgba(255, 85, 85, 0.85)',
			text: 'disconnected'
		},
		working: { dot: '#8be9fd', glow: 'rgba(139, 233, 253, 0.75)', text: 'working' },
		needsAttention: {
			dot: '#ff79c6',
			glow: 'rgba(255, 121, 198, 0.75)',
			text: 'needs attention'
		},
		done: { dot: '#50fa7b', glow: 'rgba(80, 250, 123, 0.75)', text: 'done' },
		error: { dot: '#ff5555', glow: 'rgba(255, 85, 85, 0.85)', text: 'error' }
	}

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
		dropTargetAttributes: _dropTargetAttributes = () => ({}),
		actions,
		onselect,
		onadd,
		onclose,
		onrename,
		onmove,
		...rest
	}: GooChevronTabsProps = $props()

	let editingId = $state<string | null>(null)
	let menuOpen = $state(false)
	let hasOverflow = $state(false)
	let closePressId = $state<string | null>(null)
	let dragging = $state<{
		id: string
		startX: number
		startY: number
		moved: boolean
		originalIndex: number
		pointerId: number
		insertion: number
		originalIds: string[]
		centers: Record<string, number>
		advance: number
	} | null>(null)
	let dragVisualOffset = $state(0)

	let railElement: HTMLElement | null = $state(null)
	let menuElement: HTMLElement | null = $state(null)
	const tabElements = $state<Record<string, HTMLElement>>({})
	const nameElements = $state<Record<string, HTMLElement>>({})
	let originalName = ''
	let canceledRename = false

	const canClose = $derived(allowClosingLastTab || tabs.length > 1)
	const resolvedAriaLabel = $derived(ariaLabel ?? ariaLabelAttribute ?? 'Tabs')
	const activeTab = $derived(tabs.find((tab) => tab.id === activeId) ?? null)
	const activeStatus = $derived(activeTab?.status ?? 'connected')
	const activeStatusInfo = $derived(statusInfo[activeStatus])
	const activeStatusUser = $derived(activeTab?.statusUser ?? activeTab?.name ?? 'shell')

	const finalDragOrder = $derived.by(() => {
		const drag = dragging
		if (!drag) return null
		const order = drag.originalIds.filter((id) => id !== drag.id)
		order.splice(drag.insertion, 0, drag.id)
		return order
	})

	const tabStyle = (tab: GooChevronTab, index: number): string => {
		const offset = tabDragOffset(tab, index)
		return [
			`--goo-chevron-tab-accent: ${tab.accent ?? '#79f2b0'}`,
			`z-index: ${dragging?.id === tab.id ? 1000 : tabs.length - index}`,
			`transform: translateX(${offset}px)`
		].join('; ')
	}

	const tabStatusInfo = (tab: GooChevronTab) => statusInfo[tab.status ?? 'connected']

	const tabActivity = (
		tab: GooChevronTab
	): { kind: 'working' | 'done' | 'needsAttention'; label: string } | null => {
		if (tab.status === 'working') return { kind: 'working', label: `${tab.name} agent working` }
		if (tab.status === 'done' && tab.id !== activeId)
			return { kind: 'done', label: `${tab.name} agent done` }
		if (tab.status === 'needsAttention')
			return { kind: 'needsAttention', label: `${tab.name} needs attention` }
		return null
	}

	const selectTab = (tab: GooChevronTab): void => {
		if (editingId === tab.id) return
		onselect?.(tab.id)
	}

	const selectTabAt = (index: number): void => {
		const tab = tabs[index]
		if (!tab) return
		selectTab(tab)
		tabElements[tab.id]?.focus()
	}

	const closeTab = (tab: GooChevronTab): void => {
		if (!canClose) return
		onclose?.(tab.id)
	}

	const armClose = (event: PointerEvent, tab: GooChevronTab): void => {
		event.stopPropagation()
		closePressId = tab.id
	}

	const confirmClose = (event: PointerEvent, tab: GooChevronTab): void => {
		event.stopPropagation()
		if (closePressId === tab.id) closeTab(tab)
		closePressId = null
	}

	const startRename = (tab: GooChevronTab): void => {
		if (!onrename) return
		originalName = tab.name
		canceledRename = false
		editingId = tab.id
		requestAnimationFrame(() => {
			const element = nameElements[tab.id]
			if (!element) return
			element.focus()
			const range = document.createRange()
			range.selectNodeContents(element)
			const selection = window.getSelection()
			selection?.removeAllRanges()
			selection?.addRange(range)
		})
	}

	const handleNameKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			containKeyboardEvent(event)
			;(event.currentTarget as HTMLElement).blur()
			return
		}
		if (event.key === 'Escape') {
			containKeyboardEvent(event)
			canceledRename = true
			;(event.currentTarget as HTMLElement).blur()
		}
	}

	const commitRename = (tab: GooChevronTab, element: HTMLElement): void => {
		if (canceledRename) {
			canceledRename = false
			element.textContent = originalName
			editingId = null
			return
		}
		const name = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24)
		if (name && name !== tab.name) onrename?.(tab.id, name)
		editingId = null
	}

	const handleTabKeydown = (event: KeyboardEvent, tab: GooChevronTab): void => {
		if (editingId) return
		const currentIndex = tabs.findIndex(({ id }) => id === tab.id)
		const keyboardTargetIndex = resolveChevronTabKeyboardTargetIndex(
			currentIndex,
			tabs.length,
			event.key
		)
		if (keyboardTargetIndex !== null) {
			containKeyboardEvent(event)
			selectTabAt(keyboardTargetIndex)
			return
		}
		if (isKeyboardActivationKey(event.key)) {
			containKeyboardEvent(event)
			selectTab(tab)
			return
		}
		if (event.key === 'F2') {
			containKeyboardEvent(event)
			startRename(tab)
			return
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			containKeyboardEvent(event)
			closeTab(tab)
		}
	}

	const beginDrag = (event: PointerEvent, tab: GooChevronTab): void => {
		if (editingId === tab.id || event.button !== 0) return
		const originalIds = tabs.map(({ id }) => id)
		const originalIndex = originalIds.indexOf(tab.id)
		const centers: Record<string, number> = {}
		for (const id of originalIds) {
			const rect = tabElements[id]?.getBoundingClientRect()
			if (rect) centers[id] = rect.left + rect.width / 2
		}
		dragging = {
			id: tab.id,
			startX: event.clientX,
			startY: event.clientY,
			moved: false,
			originalIndex,
			pointerId: event.pointerId,
			insertion: originalIndex,
			originalIds,
			centers,
			advance: (tabElements[tab.id]?.getBoundingClientRect().width ?? 100) - 7
		}
		railElement?.setPointerCapture?.(event.pointerId)
	}

	const moveDrag = (event: PointerEvent): void => {
		const drag = dragging
		if (!drag) return
		if (event.pointerId !== drag.pointerId) return
		const movement = event.clientX - drag.startX
		if (!drag.moved) {
			if (!hasChevronTabDragIntent(movement, event.clientY - drag.startY)) return
			drag.moved = true
		}
		event.preventDefault()
		const draggedCenter = (drag.centers[drag.id] ?? drag.startX) + movement
		const otherCenters = drag.originalIds
			.filter((id) => id !== drag.id)
			.map((id) => drag.centers[id])
			.filter((value): value is number => typeof value === 'number')
		drag.insertion = resolveChevronTabDragInsertion(draggedCenter, otherCenters)
		dragVisualOffset = movement
	}

	const finishDrag = (event?: PointerEvent): void => {
		const drag = dragging
		if (!drag) return
		if (event && event.pointerId !== drag.pointerId) return
		railElement?.releasePointerCapture?.(drag.pointerId)
		dragging = null
		dragVisualOffset = 0
		if (!drag.moved) {
			const tab = tabs.find(({ id }) => id === drag.id)
			if (tab) selectTab(tab)
			return
		}
		if (drag.insertion === drag.originalIndex) return
		onmove?.(drag.id, drag.insertion)
	}

	const tabDragOffset = (tab: GooChevronTab, index: number): number => {
		if (!dragging || !finalDragOrder) return 0
		if (tab.id === dragging.id) return dragVisualOffset
		const finalIndex = finalDragOrder.indexOf(tab.id)
		if (finalIndex < 0) return 0
		return (finalIndex - index) * dragging.advance
	}

	const scrollActiveIntoView = (): void => {
		if (!railElement || !activeId) return
		const element = tabElements[activeId]
		if (!element) return
		const tabRect = element.getBoundingClientRect()
		const railRect = railElement.getBoundingClientRect()
		if (tabRect.left < railRect.left + 10) {
			railElement.scrollBy({ left: tabRect.left - railRect.left - 10, behavior: 'smooth' })
		} else if (tabRect.right > railRect.right - 10) {
			railElement.scrollBy({ left: tabRect.right - railRect.right + 10, behavior: 'smooth' })
		}
	}

	const setMenuOpen = (open: boolean): void => {
		menuOpen = open
		if (open) {
			queueMicrotask(() => {
				if (menuElement) focusFirstMenuItem(menuElement)
			})
		}
	}

	const handleMenuKeydown = (event: KeyboardEvent): void => {
		handleMenuKeyboardEvent(event, event.currentTarget as HTMLElement, {
			close: () => setMenuOpen(false)
		})
	}

	$effect(() => {
		tabs.length
		const rail = railElement
		if (!rail) return
		const measure = () => {
			hasOverflow = rail.scrollWidth > rail.clientWidth + 4
		}
		const frame = requestAnimationFrame(measure)
		const timer = setTimeout(measure, 360)
		rail.addEventListener('transitionend', measure)
		window.addEventListener('resize', measure)
		return () => {
			cancelAnimationFrame(frame)
			clearTimeout(timer)
			rail.removeEventListener('transitionend', measure)
			window.removeEventListener('resize', measure)
		}
	})

	$effect(() => {
		activeId
		requestAnimationFrame(scrollActiveIntoView)
	})
</script>

<div {...rest} class="goo-chevron-tabs" aria-label={resolvedAriaLabel}>
	<div
		class="goo-chevron-tabs__rail"
		class:goo-chevron-tabs__rail--dragging={dragging?.moved}
		role="tablist"
		tabindex="-1"
		aria-label={resolvedAriaLabel}
		bind:this={railElement}
		onpointermove={moveDrag}
		onpointerup={(event) => finishDrag(event)}
		onpointercancel={(event) => finishDrag(event)}
	>
		<button
			class="goo-chevron-tabs__add"
			type="button"
			aria-label={addLabel}
			title={addLabel}
			onclick={onadd}
		>
			<Plus size={15} strokeWidth={2} aria-hidden="true" />
		</button>

		{#each tabs as tab, index (tab.id)}
			{@const activity = tabActivity(tab)}
			<div
				class="goo-chevron-tabs__tab"
				class:goo-chevron-tabs__tab--active={tab.id === activeId}
				class:goo-chevron-tabs__tab--dragging={tab.id === dragging?.id}
				class:goo-chevron-tabs__tab--has-activity={activity !== null && editingId !== tab.id}
				role="tab"
				tabindex="0"
				aria-selected={tab.id === activeId}
				style={tabStyle(tab, index)}
				{...tabAttributes(tab, index)}
				bind:this={tabElements[tab.id]}
				onpointerdown={(event) => beginDrag(event, tab)}
				ondblclick={() => startRename(tab)}
				onkeydown={(event) => handleTabKeydown(event, tab)}
			>
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
							<Bot size={15} strokeWidth={2.2} aria-hidden="true" />
						{:else if activity.kind === 'done'}
							<BellRing size={15} strokeWidth={2.2} aria-hidden="true" />
						{:else}
							<CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" />
						{/if}
					</span>
				{/if}
				<span
					class="goo-chevron-tabs__label"
					class:goo-chevron-tabs__label--hidden={editingId === tab.id}
				>
					{tab.name}
				</span>
				{#if editingId === tab.id}
					<span
						class="goo-chevron-tabs__label goo-chevron-tabs__label--editor"
						bind:this={nameElements[tab.id]}
						contenteditable="true"
						role="textbox"
						tabindex="-1"
						aria-label={renameLabel}
						onpointerdown={(event) => event.stopPropagation()}
						onkeydown={handleNameKeydown}
						onblur={(event) => commitRename(tab, event.currentTarget)}>{tab.name}</span
					>
				{/if}

				{#if canClose && editingId !== tab.id}
					<button
						class="goo-chevron-tabs__close"
						class:goo-chevron-tabs__close--pressed={closePressId === tab.id}
						type="button"
						aria-label={closeLabel(tab)}
						title={closeLabel(tab)}
						onpointerdown={(event) => armClose(event, tab)}
						onpointerup={(event) => confirmClose(event, tab)}
						onpointerleave={() => {
							closePressId = null
						}}
					>
						<X size={12} strokeWidth={2.2} aria-hidden="true" />
					</button>
				{/if}
			</div>
		{/each}
	</div>

	<div class="goo-chevron-tabs__right">
		{#if tabs.length > 0}
			<div class="goo-chevron-tabs__connection">
				<span
					class="goo-chevron-tabs__connection-dot"
					class:goo-chevron-tabs__connection-dot--pulsing={activeStatus === 'connecting'}
					style={`background: ${activeStatusInfo.dot}; box-shadow: 0 0 7px ${activeStatusInfo.glow}`}
					aria-hidden="true"
				></span>
				{#if activeStatus !== 'connected'}
					<span class="goo-chevron-tabs__connection-state" style={`color: ${activeStatusInfo.dot}`}>
						{activeStatusInfo.text}
					</span>
				{/if}
				<div class="goo-chevron-tabs__connection-tip">
					<div class="goo-chevron-tabs__connection-user">{activeStatusUser}</div>
					<div class="goo-chevron-tabs__connection-detail">
						<span style={`background: ${activeStatusInfo.dot}`}></span>
						<span style={`color: ${activeStatusInfo.dot}`}>{activeStatusInfo.text}</span>
					</div>
				</div>
			</div>
		{/if}
		{#if hasOverflow}
			<button
				class="goo-chevron-tabs__menu-button"
				class:goo-chevron-tabs__menu-button--open={menuOpen}
				type="button"
				aria-label="All sessions"
				title="All sessions"
				onclick={() => {
					setMenuOpen(!menuOpen)
				}}
			>
				<ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
			</button>
		{/if}
		{#if actions}
			<div class="goo-chevron-tabs__actions">
				{@render actions()}
			</div>
		{/if}
	</div>

	{#if menuOpen}
		<button
			class="goo-chevron-tabs__menu-backdrop"
			type="button"
			aria-label="Close session menu"
			onclick={() => {
				setMenuOpen(false)
			}}
		></button>
		<div
			bind:this={menuElement}
			class="goo-chevron-tabs__menu"
			role="menu"
			aria-label="Sessions"
			tabindex="-1"
			onkeydown={handleMenuKeydown}
		>
			{#each tabs as tab (tab.id)}
				<button
					class="goo-chevron-tabs__menu-row"
					class:goo-chevron-tabs__menu-row--active={tab.id === activeId}
					type="button"
					role="menuitem"
					onclick={() => {
						onselect?.(tab.id)
						setMenuOpen(false)
					}}
				>
					<span
						class="goo-chevron-tabs__menu-accent"
						style={`background: ${tab.accent ?? '#79f2b0'}`}
					></span>
					<span class="goo-chevron-tabs__menu-name">{tab.name}</span>
					<span
						class="goo-chevron-tabs__menu-status"
						style={`background: ${tabStatusInfo(tab).dot}`}
						title={tabStatusInfo(tab).text}
					></span>
				</button>
			{/each}
		</div>
	{/if}
</div>
