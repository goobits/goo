/** Virtual Grid Item Key typed model for virtual grid navigation. */
export type VirtualGridItemKey = number | string

/** Virtual Grid Item typed model for virtual grid navigation. */
export type VirtualGridItem = {
	id?: VirtualGridItemKey
	key?: VirtualGridItemKey
	selected?: boolean
}

/** Virtual Grid Item Ref typed model for virtual grid navigation. */
export type VirtualGridItemRef<T extends VirtualGridItem> = HTMLElement | T | number | string | undefined

/** Reads grid item for virtual grid navigation. */
export function getGridItem<T extends VirtualGridItem>(
	items: T[],
	ref: VirtualGridItemRef<T>
): T | undefined {
	if (ref instanceof HTMLElement) {
		ref = readElementRef(ref)
	}

	switch (typeof ref) {
		case 'string':
			return items.find(item => item?.key !== null && item?.key !== undefined && String(item.key) === ref)

		case 'number':
			return items[ref]

		case 'object':
			return findMatchingItem(items, ref)

		default:
			return undefined
	}
}

/** Reads grid item element for virtual grid navigation. */
export function getGridItemElement<T extends VirtualGridItem>(
	rootElement: HTMLElement | undefined,
	items: T[],
	ref: VirtualGridItemRef<T>
): HTMLElement | null {
	const item = getGridItem(items, ref)
	if (!item || !rootElement) return null

	if (item.key !== null && item.key !== undefined) {
		return rootElement.querySelector<HTMLElement>(`[data-key="${ escapeSelectorValue(String(item.key)) }"]`)
	}

	return rootElement.querySelector<HTMLElement>(`[data-index="${ items.indexOf(item) }"]`)
}

/** Reads selected grid item for virtual grid navigation. */
export function getSelectedGridItem<T extends VirtualGridItem>(items: T[]): T | undefined {
	return items.find(item => item?.selected)
}

/** Sets grid item selected for virtual grid navigation. */
export function setGridItemSelected<T extends VirtualGridItem>(
	items: T[],
	ref: VirtualGridItemRef<T>,
	selected = true
): T | undefined {
	const item = getGridItem(items, ref)
	if (!item || item.selected === selected) return

	item.selected = selected
	return item
}

/** Reads grid columns for virtual grid navigation. */
export function getGridColumns(rootElement: HTMLElement | undefined): number {
	const grid = rootElement?.querySelector<HTMLElement>('.goo-virtual-grid')
	return Math.max(1, Number.parseInt(grid?.dataset.columns ?? '1'))
}

/** Reads grid row height for virtual grid navigation. */
export function getGridRowHeight(rootElement: HTMLElement | undefined, fallback: number): number {
	const item = rootElement?.querySelector<HTMLElement>('.goo-grid-view__item, sketch-grid-item')
	const rect = item?.getBoundingClientRect()
	return Math.max(1, rect?.height || fallback)
}

/** Scrolls to to grid item for virtual grid navigation. */
export function scrollToGridItem<T extends VirtualGridItem>(
	rootElement: HTMLElement | undefined,
	items: T[],
	ref: VirtualGridItemRef<T>,
	fallbackRowHeight: number
): void {
	const item = getGridItem(items, ref)
	if (!item || !rootElement) return

	const index = items.indexOf(item)
	if (index < 0) return

	const columns = getGridColumns(rootElement)
	const rowHeight = getGridRowHeight(rootElement, fallbackRowHeight)
	rootElement.scrollTop = Math.floor(index / columns) * rowHeight
}

/** Reads visible grid indexes for virtual grid navigation. */
export function getVisibleGridIndexes<T extends VirtualGridItem>(
	rootElement: HTMLElement | undefined,
	items: T[],
	rowsToBuffer: number,
	fallbackRowHeight: number
): { startIndex: number; endIndex: number } {
	if (!rootElement) {
		return { startIndex: 0, endIndex: Math.max(0, items.length - 1) }
	}

	const columns = getGridColumns(rootElement)
	const rowHeight = getGridRowHeight(rootElement, fallbackRowHeight)
	const visibleRows = Math.max(1, Math.ceil(rootElement.clientHeight / rowHeight))
	const firstVisibleRow = Math.max(0, Math.floor(rootElement.scrollTop / rowHeight))
	const startIndex = Math.max(0, (firstVisibleRow - rowsToBuffer) * columns)
	const endIndex = Math.min(
		items.length - 1,
		(firstVisibleRow + visibleRows + rowsToBuffer) * columns - 1
	)

	return { startIndex, endIndex }
}

function readElementRef(element: HTMLElement): string | number | undefined {
	if (element.dataset.key !== null && element.dataset.key !== undefined) {
		return element.dataset.key
	}

	const index = element.dataset.index
	return index === null || index === undefined ? undefined : Number.parseInt(index)
}

function findMatchingItem<T extends VirtualGridItem>(items: T[], ref: T): T | undefined {
	if (ref.key !== null && ref.key !== undefined) {
		const key = String(ref.key)
		return items.find(item => item?.key !== null && item?.key !== undefined && String(item.key) === key)
	}

	if (ref.id !== null && ref.id !== undefined) {
		const id = String(ref.id)
		return items.find(item => item?.id !== null && item?.id !== undefined && String(item.id) === id)
	}

	return ref
}

function escapeSelectorValue(value: string): string {
	return globalThis.CSS?.escape
		? globalThis.CSS.escape(value)
		: value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}
