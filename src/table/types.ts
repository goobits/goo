import type { GooDataGridProps } from '../data-grid/index.ts'

/** Props accepted by the virtualized, sortable Goo table component. */
export interface GooTableProps<T> extends GooDataGridProps<T> {

	/** Enables sortable column headers. Defaults to true for tables. */
	sortable?: boolean
}
