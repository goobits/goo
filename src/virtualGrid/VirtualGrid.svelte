<script lang="ts" generics="T">
	import './VirtualGrid.css'

	import type { VirtualGridProps, VirtualGridSlot, VirtualGridWindow } from './types.ts'
	import { calculateVirtualGridWindow, virtualGridSpacerHeight } from './virtualWindow.ts'

	const DEFAULT_OVERSCAN_ROWS = 8
	const MOBILE_OVERSCAN_ROWS = 4
	const DEFAULT_TILE_HEIGHT = 180
	const DEFAULT_ROW_GAP = 16
	const DEFER_CONTENT_SETTLE_MS = 120

	let {
		items,
		scrollRoot,
		includeLeadingSlot = false,
		className = 'goo-virtual-grid',
		role = 'presentation',
		ariaLabel,
		ariaRowCount,
		ariaMultiselectable,
		tileSelector = '.thumb',
		overscanRows: configuredOverscanRows = DEFAULT_OVERSCAN_ROWS,
		mobileOverscanRows = MOBILE_OVERSCAN_ROWS,
		defaultTileHeight = DEFAULT_TILE_HEIGHT,
		defaultRowGap = DEFAULT_ROW_GAP,
		deferContentSettleMs = DEFER_CONTENT_SETTLE_MS,
		onvirtualnavigate,
		onclick,
		onkeydown,
		oncontextmenu,
		ondblclick,
		children
	}: VirtualGridProps<T> = $props()

	let itemsEl = $state<HTMLElement | undefined>()
	let itemsTop = $state(0)
	let columns = $state(1)
	let tileHeight = $state(DEFAULT_TILE_HEIGHT)
	let rowGap = $state(DEFAULT_ROW_GAP)
	let constrainedDevice = $state(readConstrainedDevice())
	let deferContent = $state(false)
	let windowState = $state<VirtualGridWindow>({
		startSlot: 0,
		endSlot: 0,
		topRows: 0,
		bottomRows: 0
	})
	let measureFrame: number | null = null
	let deferContentTimer: ReturnType<typeof setTimeout> | null = null

	let effectiveOverscanRows = $derived(constrainedDevice ? mobileOverscanRows : configuredOverscanRows)
	let totalItems = $derived(items.length + (includeLeadingSlot ? 1 : 0))
	let rowStride = $derived(tileHeight + rowGap)
	let totalRows = $derived(Math.ceil(totalItems / columns))
	let virtual = $derived(totalItems > columns * 8)

	function readConstrainedDevice(): boolean {
		if (typeof window === 'undefined') return false
		const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches
		const narrowViewport = window.matchMedia('(max-width: 700px)').matches
		const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
		return coarsePointer || narrowViewport || (memory !== undefined && memory <= 4)
	}

	function nextWindow(scrollTop: number, viewportHeight: number): VirtualGridWindow {
		return calculateVirtualGridWindow({
			columns,
			itemsTop,
			overscanRows: effectiveOverscanRows,
			rowGap,
			tileHeight,
			totalItems,
			viewportHeight,
			scrollTop,
			virtual
		})
	}

	function setWindowState(next: VirtualGridWindow, force = false) {
		if (!force
			&& windowState.startSlot === next.startSlot
			&& windowState.endSlot === next.endSlot
			&& windowState.topRows === next.topRows
			&& windowState.bottomRows === next.bottomRows) {
			return
		}
		windowState = next
	}

	let visibleSlots = $derived.by(() => {
		const out: number[] = []
		for (let slot = windowState.startSlot; slot < windowState.endSlot; slot++) out.push(slot)
		return out
	})

	let topSpacerHeight = $derived(virtualGridSpacerHeight(windowState.topRows, tileHeight, rowGap))
	let bottomSpacerHeight = $derived(virtualGridSpacerHeight(windowState.bottomRows, tileHeight, rowGap))

	function itemForSlot(slot: number): T | null {
		const idx = slot - (includeLeadingSlot ? 1 : 0)
		return items[idx] ?? null
	}

	function measure() {
		measureFrame = null
		if (!itemsEl || !scrollRoot) return
		constrainedDevice = readConstrainedDevice()
		const style = getComputedStyle(itemsEl)
		const tracks = style.gridTemplateColumns
			.split(' ')
			.filter(track => track && track !== 'none')
		columns = Math.max(1, tracks.length)
		rowGap = parseFloat(style.rowGap) || defaultRowGap

		const tile = itemsEl.querySelector<HTMLElement>(tileSelector)
		if (tile) tileHeight = tile.getBoundingClientRect().height || defaultTileHeight

		const rootRect = scrollRoot.getBoundingClientRect()
		const itemsRect = itemsEl.getBoundingClientRect()
		itemsTop = itemsRect.top - rootRect.top + scrollRoot.scrollTop
		setWindowState(nextWindow(scrollRoot.scrollTop, scrollRoot.clientHeight), true)
	}

	function scheduleMeasure() {
		if (measureFrame !== null) return
		measureFrame = requestAnimationFrame(measure)
	}

	function handleScroll() {
		if (!scrollRoot) return
		setWindowState(nextWindow(scrollRoot.scrollTop, scrollRoot.clientHeight))
		deferContentDuringScroll()
	}

	function deferContentDuringScroll() {
		if (!virtual || !constrainedDevice) return
		deferContent = true
		if (deferContentTimer !== null) clearTimeout(deferContentTimer)
		deferContentTimer = setTimeout(() => {
			deferContent = false
			deferContentTimer = null
		}, deferContentSettleMs)
	}

	function handleVirtualNavigate(e: Event) {
		const detail = (e as CustomEvent<{ slot: number; extend: boolean }>).detail
		if (scrollRoot) {
			const row = Math.floor(detail.slot / columns)
			scrollRoot.scrollTop = itemsTop + row * rowStride
		}
		onvirtualnavigate?.(e as CustomEvent<{ slot: number; extend: boolean }>)
	}

	$effect(() => {
		if (!scrollRoot) return
		scheduleMeasure()
		itemsEl?.addEventListener('virtualgridnavigate', handleVirtualNavigate)
		scrollRoot.addEventListener('scroll', handleScroll, { passive: true })
		const resizeObserver = new ResizeObserver(scheduleMeasure)
		if (itemsEl) resizeObserver.observe(itemsEl)
		resizeObserver.observe(scrollRoot)
		return () => {
			if (measureFrame !== null) cancelAnimationFrame(measureFrame)
			measureFrame = null
			if (deferContentTimer !== null) clearTimeout(deferContentTimer)
			deferContentTimer = null
			itemsEl?.removeEventListener('virtualgridnavigate', handleVirtualNavigate)
			scrollRoot.removeEventListener('scroll', handleScroll)
			resizeObserver.disconnect()
		}
	})

	$effect(() => {
		void items.length
		void includeLeadingSlot
		scheduleMeasure()
	})
</script>

<div
	class={`goo-virtual-grid ${ className }`}
	bind:this={itemsEl}
	onclick={onclick}
	onkeydown={onkeydown}
	ondblclick={ondblclick}
	oncontextmenu={oncontextmenu}
	{role}
	aria-label={ariaLabel}
	aria-rowcount={ariaRowCount}
	aria-multiselectable={ariaMultiselectable}
	data-total={totalItems}
	data-columns={columns}
>
	{#if topSpacerHeight > 0}
		<div class="goo-virtual-grid-spacer" style:height={`${ topSpacerHeight }px`}></div>
	{/if}
	{#each visibleSlots as slot, poolIndex (poolIndex)}
		{@render children({
			slot,
			item: itemForSlot(slot),
			leading: includeLeadingSlot && slot === 0,
			deferContent
		})}
	{/each}
	{#if bottomSpacerHeight > 0}
		<div class="goo-virtual-grid-spacer" style:height={`${ bottomSpacerHeight }px`}></div>
	{/if}
</div>
