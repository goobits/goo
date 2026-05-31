export type {
	GooDataGridCellSlot as GooTableCellSlot,
	GooDataGridCellValue as GooTableCellValue,
	GooDataGridColumn as GooTableColumn,
	GooDataGridColumnAlign as GooTableColumnAlign,
	GooDataGridDensity as GooTableDensity,
	GooDataGridHeaderSlot as GooTableHeaderSlot,
	GooDataGridRowKey as GooTableRowKey,
	GooDataGridSortDirection as GooTableSortDirection,
	GooDataGridSortState as GooTableSortState,
	GooDataGridSortValue as GooTableSortValue
} from '../data-grid/index.ts'
/// <reference path="../svelte.d.ts" />

export { default as GooTable } from './GooTable.svelte'
export type { GooTableProps } from './types.ts'
