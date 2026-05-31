import type { Snippet } from 'svelte'

export interface VirtualGridWindow {
	startSlot: number
	endSlot: number
	topRows: number
	bottomRows: number
}

export interface VirtualGridSlot<T> {
	slot: number
	item: T | null
	leading: boolean
	deferContent: boolean
}

export interface VirtualGridProps<T> {
	items: T[]
	scrollRoot?: HTMLElement
	includeLeadingSlot?: boolean
	className?: string

	/** Container ARIA role. Defaults to `presentation`; set `grid`/`listbox` to expose selection semantics. */
	role?: string

	/** Accessible name for the container when a semantic `role` is set. */
	ariaLabel?: string

	/** Total row count for assistive tech (`aria-rowcount`), independent of the virtualized window. */
	ariaRowCount?: number

	/** Whether a semantic grid/listbox allows multiple selection (`aria-multiselectable`). */
	ariaMultiselectable?: boolean
	tileSelector?: string
	overscanRows?: number
	mobileOverscanRows?: number
	defaultTileHeight?: number
	defaultRowGap?: number
	deferContentSettleMs?: number
	onvirtualnavigate?: (e: CustomEvent<{ slot: number; extend: boolean }>) => void
	onclick?: (e: MouseEvent) => void
	onkeydown?: (e: KeyboardEvent) => void
	oncontextmenu?: (e: MouseEvent) => void
	ondblclick?: (e: MouseEvent) => void
	children: Snippet<[VirtualGridSlot<T>]>
}
