import type { VirtualGridWindow } from './types.js'

/** Parameters for calculating the visible virtual grid window. */
export interface VirtualGridWindowOptions {
	columns: number
	itemsTop: number
	overscanRows: number
	rowGap: number
	tileHeight: number
	totalItems: number
	viewportHeight: number
	scrollTop: number
	virtual: boolean
}

/**
 * Calculate the visible slot window for a virtualized grid.
 * @param options - Current grid measurement and scroll state.
 * @returns Visible slot bounds and spacer row counts.
 */
export function calculateVirtualGridWindow({
	columns,
	itemsTop,
	overscanRows,
	rowGap,
	tileHeight,
	totalItems,
	viewportHeight,
	scrollTop,
	virtual
}: VirtualGridWindowOptions): VirtualGridWindow {
	const safeColumns = Math.max(1, columns)
	const rowStride = tileHeight + rowGap
	const totalRows = Math.ceil(totalItems / safeColumns)

	if (!virtual) {
		return {
			startSlot: 0,
			endSlot: totalItems,
			topRows: 0,
			bottomRows: 0
		}
	}

	const localTop = Math.max(0, scrollTop - itemsTop)
	const firstRow = Math.min(
		Math.max(0, totalRows - 1),
		Math.max(0, Math.floor(localTop / rowStride) - overscanRows)
	)
	const lastVisibleRow = Math.ceil((localTop + viewportHeight) / rowStride)
	const lastRow = Math.min(totalRows - 1, lastVisibleRow + overscanRows)

	return {
		startSlot: firstRow * safeColumns,
		endSlot: Math.min(totalItems, (lastRow + 1) * safeColumns),
		topRows: firstRow,
		bottomRows: Math.max(0, totalRows - lastRow - 1)
	}
}

/**
 * Convert virtual spacer rows into pixel height.
 * @param rows - Spacer row count.
 * @param tileHeight - Measured tile height.
 * @param rowGap - Measured row gap.
 * @returns Spacer height in pixels.
 */
export function virtualGridSpacerHeight(rows: number, tileHeight: number, rowGap: number): number {
	if (rows <= 0) {
		return 0
	}

	return rows * (tileHeight + rowGap) - rowGap
}
