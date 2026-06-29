<script lang="ts" generics="T">
import './GooDataGrid.css'

import ArrowDown from '@lucide/svelte/icons/arrow-down'
import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up'
import ArrowUp from '@lucide/svelte/icons/arrow-up'
import { tick, untrack } from 'svelte'

import {
	containKeyboardEvent,
	isKeyboardActivationKey
} from '../support/keyboard/_keyboardActivation.ts'
import { calculateVirtualGridWindow, virtualGridSpacerHeight, virtualGridWindowsEqual } from '../virtualGrid/virtualWindow.ts'
import type { VirtualGridWindow } from '../virtualGrid/types.ts'
import type {
	GooDataGridCellValue,
	GooDataGridProps,
	GooDataGridRowKey,
	GooDataGridSortState,
	GooDataGridSortValue
} from './types.ts'

const AUTO_VIRTUAL_ROW_COUNT = 80
const DEFAULT_ROW_HEIGHT = 44
const DEFAULT_OVERSCAN_ROWS = 8

let gridElement: HTMLElement | undefined = $state()

let {
	rows,
	columns,
	ariaLabel = 'Data grid',
	class: className = '',
	density = 'default',
	emptyLabel = 'No records',
	loadingLabel = 'Loading records',
	loading = false,
	sortable = false,
	defaultSort = null,
	sort = undefined,
	virtual = 'auto',
	scrollRoot,
	rowHeight = DEFAULT_ROW_HEIGHT,
	overscanRows = DEFAULT_OVERSCAN_ROWS,
	getRowKey,
	onrowclick,
	onrowactivate,
	onsortchange
}: GooDataGridProps<T> = $props()

let internalSort = $state<GooDataGridSortState | null>(null)
let defaultSortApplied = false
// Roving tabindex: the sorted-row position (0-based) that is currently tabbable
// in grid mode. Only this row carries tabindex=0; arrow keys move it.
let activeSlot = $state(0)
let windowState = $state<VirtualGridWindow>({
	bottomRows: 0,
	endSlot: 0,
	startSlot: 0,
	topRows: 0
})

let effectiveScrollRoot = $derived(scrollRoot ?? gridElement)
let virtualEnabled = $derived(
	Boolean(effectiveScrollRoot) &&
		(virtual === true || (virtual === 'auto' && rows.length > AUTO_VIRTUAL_ROW_COUNT))
)
let templateColumns = $derived(
	columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ')
)
let effectiveSort = $derived(sort === undefined ? internalSort : sort)
let sortedRows = $derived.by(() => {
	const entries = rows.map((row, rowIndex) => ({ row, rowIndex }))
	if (!effectiveSort) return entries
	const columnIndex = columns.findIndex((column) => column.key === effectiveSort.key)
	const column = columns[columnIndex]
	if (!column || !isColumnSortable(columnIndex)) return entries
	const direction = effectiveSort.direction === 'desc' ? -1 : 1
	return [...entries].sort((left, right) => {
		const result = compareSortValues(
			sortValue(left.row, left.rowIndex, columnIndex),
			sortValue(right.row, right.rowIndex, columnIndex)
		)
		return result === 0 ? left.rowIndex - right.rowIndex : result * direction
	})
})
let classes = $derived.by(() => {
	const values = ['goo-data-grid']
	values.push(`goo-data-grid--${density}`)
	if (virtualEnabled) values.push('goo-data-grid--virtual')
	if (className) values.push(className)
	return values.join(' ')
})
let visibleRows = $derived.by(() => {
	if (!virtualEnabled) {
		return sortedRows
	}
	return sortedRows.slice(windowState.startSlot, windowState.endSlot)
})
let topSpacerHeight = $derived(virtualGridSpacerHeight(windowState.topRows, rowHeight, 0))
let bottomSpacerHeight = $derived(virtualGridSpacerHeight(windowState.bottomRows, rowHeight, 0))

function setWindowState(next: VirtualGridWindow): void {
	if (untrack(() => virtualGridWindowsEqual(windowState, next))) return
	windowState = next
}

function updateWindow(): void {
	if (!effectiveScrollRoot) {
		setWindowState({
			bottomRows: 0,
			endSlot: sortedRows.length,
			startSlot: 0,
			topRows: 0
		})
		return
	}
	const viewportHeight = effectiveScrollRoot.clientHeight || rowHeight * Math.min(sortedRows.length, 12)
	setWindowState(calculateVirtualGridWindow({
		columns: 1,
		itemsTop: 0,
		overscanRows,
		rowGap: 0,
		tileHeight: rowHeight,
		totalItems: sortedRows.length,
		viewportHeight,
		scrollTop: effectiveScrollRoot.scrollTop,
		virtual: virtualEnabled
	}))
}

function rowKey(row: T, rowIndex: number): GooDataGridRowKey {
	return getRowKey?.(row, rowIndex) ?? rowIndex
}

function cellValue(row: T, rowIndex: number, columnIndex: number): GooDataGridCellValue {
	const column = columns[columnIndex]
	if (!column) return ''
	const value = column.value ? column.value(row, rowIndex) : (row as Record<string, unknown>)[column.key]
	if (column.format) return column.format(value as GooDataGridCellValue, row, rowIndex)
	return value as GooDataGridCellValue
}

function cellText(row: T, rowIndex: number, columnIndex: number): string {
	const value = cellValue(row, rowIndex, columnIndex)
	if (value === null || value === undefined) return ''
	if (typeof value === 'boolean') return value ? 'Yes' : 'No'
	return String(value)
}

function sortValue(row: T, rowIndex: number, columnIndex: number): GooDataGridSortValue {
	const column = columns[columnIndex]
	if (!column) return ''
	return column.sortValue?.(row, rowIndex) ?? cellValue(row, rowIndex, columnIndex)
}

function compareSortValues(left: GooDataGridSortValue, right: GooDataGridSortValue): number {
	const leftValue = normalizedSortValue(left)
	const rightValue = normalizedSortValue(right)
	if (leftValue === rightValue) return 0
	if (leftValue === null) return 1
	if (rightValue === null) return -1
	if (typeof leftValue === 'number' && typeof rightValue === 'number') {
		return leftValue - rightValue
	}
	return String(leftValue).localeCompare(String(rightValue), undefined, {
		numeric: true,
		sensitivity: 'base'
	})
}

function normalizedSortValue(value: GooDataGridSortValue): null | number | string {
	if (value === null || value === undefined) return null
	if (value instanceof Date) return value.getTime()
	if (typeof value === 'boolean') return value ? 1 : 0
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	const trimmed = value.trim()
	if (!trimmed) return null
	const numeric = Number(trimmed.replace(/[$,%\s,]/g, ''))
	if (Number.isFinite(numeric) && /[0-9]/.test(trimmed)) return numeric
	const timestamp = Date.parse(trimmed)
	if (
		Number.isFinite(timestamp) &&
		/(?:\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(trimmed)
	) {
		return timestamp
	}
	return trimmed
}

function cellClasses(columnIndex: number, baseClass: string): string {
	const column = columns[columnIndex]
	const values = [baseClass]
	if (column?.align) values.push(`${baseClass}--align-${column.align}`)
	if (column?.class) values.push(column.class)
	return values.join(' ')
}

function isColumnSortable(columnIndex: number): boolean {
	const column = columns[columnIndex]
	return Boolean(column && sortable && column.sortable !== false)
}

function columnSortDirection(columnIndex: number): GooDataGridSortState['direction'] | undefined {
	const column = columns[columnIndex]
	return column && effectiveSort?.key === column.key ? effectiveSort.direction : undefined
}

function columnAriaSort(columnIndex: number): 'ascending' | 'descending' | 'none' | undefined {
	const direction = columnSortDirection(columnIndex)
	if (direction === 'asc') return 'ascending'
	if (direction === 'desc') return 'descending'
	return isColumnSortable(columnIndex) ? 'none' : undefined
}

function toggleColumnSort(columnIndex: number): void {
	const column = columns[columnIndex]
	if (!column || !isColumnSortable(columnIndex)) return
	const direction: GooDataGridSortState['direction'] =
		effectiveSort?.key === column.key && effectiveSort.direction === 'asc' ? 'desc' : 'asc'
	const next: GooDataGridSortState = { key: column.key, direction }
	internalSort = next
	onsortchange?.(next)
}

function handleRowClick(row: T, rowIndex: number, event: MouseEvent): void {
	onrowclick?.(row, rowIndex, event)
	onrowactivate?.(row, rowIndex, event)
}

function handleRowKeydown(row: T, rowIndex: number, slot: number, event: KeyboardEvent): void {
	if (isKeyboardActivationKey(event.key)) {
		containKeyboardEvent(event)
		onrowactivate?.(row, rowIndex, event)
		return
	}

	switch (event.key) {
		case 'ArrowDown':
			containKeyboardEvent(event)
			void focusSlot(slot + 1)
			return
		case 'ArrowUp':
			containKeyboardEvent(event)
			void focusSlot(slot - 1)
			return
		case 'Home':
			containKeyboardEvent(event)
			void focusSlot(0)
			return
		case 'End':
			containKeyboardEvent(event)
			void focusSlot(sortedRows.length - 1)
	}
}

/**
 * Move roving focus to a sorted-row position, scrolling it into the virtual
 * window first so the target row is rendered before we focus it.
 */
async function focusSlot(nextSlot: number): Promise<void> {
	const clamped = Math.max(0, Math.min(sortedRows.length - 1, nextSlot))
	activeSlot = clamped

	if (virtualEnabled && effectiveScrollRoot) {
		const top = clamped * rowHeight
		const bottom = top + rowHeight
		const viewTop = effectiveScrollRoot.scrollTop
		const viewBottom = viewTop + effectiveScrollRoot.clientHeight
		if (top < viewTop) {
			effectiveScrollRoot.scrollTop = top
		} else if (bottom > viewBottom) {
			effectiveScrollRoot.scrollTop = bottom - effectiveScrollRoot.clientHeight
		}
		updateWindow()
	}

	await tick()
	const target = gridElement?.querySelector<HTMLElement>(`[data-slot="${clamped}"]`)
	target?.focus()
}

$effect(() => {
	if (!defaultSortApplied) {
		internalSort = defaultSort
		defaultSortApplied = true
	}
})

$effect(() => {
	const lastSlot = Math.max(0, sortedRows.length - 1)
	if (activeSlot > lastSlot) activeSlot = lastSlot
})

$effect(() => {
	void rows.length
	void sortedRows.length
	void rowHeight
	void overscanRows
	void virtualEnabled
	updateWindow()
})

$effect(() => {
	const root = effectiveScrollRoot
	if (!root) return
	root.addEventListener('scroll', updateWindow, { passive: true })
	const resizeObserver = typeof ResizeObserver === 'undefined'
		? undefined
		: new ResizeObserver(updateWindow)
	resizeObserver?.observe(root)
	return () => {
		root.removeEventListener('scroll', updateWindow)
		resizeObserver?.disconnect()
	}
})
</script>

<div
	bind:this={gridElement}
	class={classes}
	role={onrowactivate ? 'grid' : 'table'}
	aria-label={ariaLabel}
	aria-busy={loading ? 'true' : undefined}
	aria-rowcount={sortedRows.length + 1}
	data-row-count={rows.length}
>
	<div class="goo-data-grid__header" role="rowgroup">
		<div class="goo-data-grid__row goo-data-grid__row--header" role="row" aria-rowindex={1} style:grid-template-columns={templateColumns}>
			{#each columns as column, columnIndex (column.key)}
				<div
					class={cellClasses(columnIndex, 'goo-data-grid__header-cell')}
					role="columnheader"
					aria-label={column.ariaLabel}
					aria-sort={columnAriaSort(columnIndex)}
				>
					{#if isColumnSortable(columnIndex)}
						<button
							class="goo-data-grid__sort-button"
							type="button"
							aria-label={`Sort by ${column.ariaLabel ?? column.label}`}
							onclick={() => toggleColumnSort(columnIndex)}
						>
							<span>
								{#if column.header}
									{@render column.header({ column })}
								{:else}
									{column.label}
								{/if}
							</span>
							<span class="goo-data-grid__sort-indicator" aria-hidden="true">
								{#if columnSortDirection(columnIndex) === 'asc'}
									<ArrowUp size={14} />
								{:else if columnSortDirection(columnIndex) === 'desc'}
									<ArrowDown size={14} />
								{:else}
									<ArrowDownUp size={14} />
								{/if}
							</span>
						</button>
					{:else if column.header}
						{@render column.header({ column })}
					{:else}
						{column.label}
					{/if}
				</div>
			{/each}
		</div>
	</div>
	<div class="goo-data-grid__body" role="rowgroup">
		{#if loading}
			<div class="goo-data-grid__state" role="status">{loadingLabel}</div>
		{:else if sortedRows.length === 0}
			<div class="goo-data-grid__state" role="status">{emptyLabel}</div>
		{:else}
			{#if topSpacerHeight > 0}
				<div class="goo-data-grid__spacer" style:height={`${topSpacerHeight}px`}></div>
			{/if}
			{#each visibleRows as entry, visibleIndex (rowKey(entry.row, entry.rowIndex))}
				{@const slot = windowState.startSlot + visibleIndex}
				<div
					class="goo-data-grid__row goo-data-grid__row--body"
					role="row"
					aria-rowindex={slot + 2}
					tabindex={onrowactivate ? (slot === activeSlot ? 0 : -1) : undefined}
					style:grid-template-columns={templateColumns}
					onclick={(event) => handleRowClick(entry.row, entry.rowIndex, event)}
					onkeydown={(event) => handleRowKeydown(entry.row, entry.rowIndex, slot, event)}
					onfocus={() => { activeSlot = slot }}
					data-row-index={entry.rowIndex}
					data-slot={slot}
				>
					{#each columns as column, columnIndex (column.key)}
						<div class={cellClasses(columnIndex, 'goo-data-grid__cell')} role="cell">
							{#if column.cell}
								{@render column.cell({ column, row: entry.row, rowIndex: entry.rowIndex })}
							{:else}
								{cellText(entry.row, entry.rowIndex, columnIndex)}
							{/if}
						</div>
					{/each}
				</div>
			{/each}
			{#if bottomSpacerHeight > 0}
				<div class="goo-data-grid__spacer" style:height={`${bottomSpacerHeight}px`}></div>
			{/if}
		{/if}
	</div>
</div>
