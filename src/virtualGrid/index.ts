export type { GridArrowKey } from './gridKeyboard.ts'
export { isGridArrowKey, nextGridIndex } from './gridKeyboard.ts'
export type { GridMarqueeMode, GridMarqueeOptions, RectXYWH } from './gridMarquee.ts'
export { gridMarquee, rectIntersects } from './gridMarquee.ts'
export type { GridClickModifiers, GridSelectionState } from './gridSelection.ts'
export { nextGridClickSelection, nextGridMarqueeSelection, sameGridSelection } from './gridSelection.ts'
export type { VirtualGridProps, VirtualGridSlot, VirtualGridWindow } from './types.ts'
/// <reference path="../svelte.d.ts" />

export type { VirtualGridItem, VirtualGridItemKey, VirtualGridItemRef } from './itemAdapter.ts'
export {
	getGridColumns,
	getGridItem,
	getGridItemElement,
	getGridRowHeight,
	getSelectedGridItem,
	getVisibleGridIndexes,
	scrollToGridItem,
	setGridItemSelected
} from './itemAdapter.ts'
export { default as VirtualGrid } from './VirtualGrid.svelte'
export type { VirtualGridWindowOptions } from './virtualWindow.ts'
export { calculateVirtualGridWindow, virtualGridSpacerHeight } from './virtualWindow.ts'
