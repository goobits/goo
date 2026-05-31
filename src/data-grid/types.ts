import type { Snippet } from 'svelte'

/** Unique key used to identify a rendered data-grid row. */
export type GooDataGridRowKey = number | string

/** Data-grid column alignment. */
export type GooDataGridColumnAlign = 'center' | 'end' | 'start'

/** Data-grid density preset. */
export type GooDataGridDensity = 'compact' | 'comfortable' | 'default'

/** Data-grid sort direction. */
export type GooDataGridSortDirection = 'asc' | 'desc'

/** Plain value supported by data-grid sorting. */
export type GooDataGridSortValue = boolean | Date | null | number | string | undefined

/** Active sort state for a data grid. */
export interface GooDataGridSortState {

	/** Column key currently used for sorting. */
	key: string

	/** Direction used for the current sort. */
	direction: GooDataGridSortDirection
}

/** Render context passed to custom data-grid header snippets. */
export interface GooDataGridHeaderSlot<T> {

	/** Column definition being rendered. */
	column: GooDataGridColumn<T>
}

/** Render context passed to custom data-grid cell snippets. */
export interface GooDataGridCellSlot<T> {

	/** Column definition being rendered. */
	column: GooDataGridColumn<T>

	/** Row object for the current cell. */
	row: T

	/** Zero-based source row index. */
	rowIndex: number
}

/** Column definition accepted by `GooDataGrid`. */
export interface GooDataGridColumn<T> {

	/** Stable column key. */
	key: string

	/** Header label used when no custom header snippet is supplied. */
	label: string

	/** Optional accessible label when visual label is abbreviated. */
	ariaLabel?: string

	/** Column alignment. */
	align?: GooDataGridColumnAlign

	/** CSS grid track size for this column. */
	width?: string

	/** Optional class applied to header and body cells for this column. */
	class?: string

	/** Whether this column can be sorted. Uses the grid-level sortable setting by default. */
	sortable?: boolean

	/** Reads a sort value from a row. Defaults to the rendered cell value. */
	sortValue?: (row: T, rowIndex: number) => GooDataGridSortValue

	/** Reads a cell value from a row when no custom cell snippet is supplied. */
	value?: (row: T, rowIndex: number) => GooDataGridCellValue

	/** Formats a cell value for plain text rendering. */
	format?: (value: GooDataGridCellValue, row: T, rowIndex: number) => string

	/** Custom Svelte snippet for the header cell. */
	header?: Snippet<[GooDataGridHeaderSlot<T>]>

	/** Custom Svelte snippet for the body cell. */
	cell?: Snippet<[GooDataGridCellSlot<T>]>
}

/** Plain value supported by the default data-grid cell renderer. */
export type GooDataGridCellValue = boolean | null | number | string | undefined

/** Props accepted by the Svelte `GooDataGrid` component. */
export interface GooDataGridProps<T> {

	/** Rows to render. */
	rows: T[]

	/** Columns to render for each row. */
	columns: GooDataGridColumn<T>[]

	/** Accessible table label. */
	ariaLabel?: string

	/** Extra CSS class names. */
	class?: string

	/** Row density preset. */
	density?: GooDataGridDensity

	/** Empty-state label shown when `rows` is empty. */
	emptyLabel?: string

	/** Loading-state label shown when `loading` is true. */
	loadingLabel?: string

	/** Whether the grid is loading. */
	loading?: boolean

	/** Enables sortable column headers. */
	sortable?: boolean

	/** Initial sort state for uncontrolled grids. */
	defaultSort?: GooDataGridSortState | null

	/** Controlled sort state. */
	sort?: GooDataGridSortState | null

	/** Enable row virtualization. `auto` enables it for larger row sets. */
	virtual?: boolean | 'auto'

	/** Scroll container used for virtualization. */
	scrollRoot?: HTMLElement

	/** Estimated row height used by the virtual window. */
	rowHeight?: number

	/** Rows rendered above and below the visible viewport. */
	overscanRows?: number

	/** Reads a stable key for a row. */
	getRowKey?: (row: T, rowIndex: number) => GooDataGridRowKey

	/** Native click callback for a row. */
	onrowclick?: (row: T, rowIndex: number, event: MouseEvent) => void

	/** Keyboard/click activation callback for a row. */
	onrowactivate?: (row: T, rowIndex: number, event: KeyboardEvent | MouseEvent) => void

	/** Sort-state change callback. */
	onsortchange?: (sort: GooDataGridSortState | null) => void
}
