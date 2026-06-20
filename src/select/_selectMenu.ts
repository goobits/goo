import type { GooSelectMenuOptions, GooSelectMenuPlacement } from './types.ts'

export type NormalizedGooSelectMenu = {
	arrow: boolean
	backdrop: boolean
	offset?: { x?: number; y?: number }
	outline: boolean
	placement: GooSelectMenuPlacement
	popoutClassName?: string
	variant: 'attached' | 'floating'
	width: 'auto' | 'content' | 'trigger'
}

const defaultSelectMenu: NormalizedGooSelectMenu = {
	arrow: false,
	backdrop: false,
	outline: false,
	placement: 'bottom-start',
	variant: 'floating',
	width: 'trigger'
}

const placementAlignments: Record<GooSelectMenuPlacement, string> = {
	top: 'bottom to top',
	'top-start': 'bottom left to top left',
	'top-end': 'bottom right to top right',
	right: 'left to right',
	'right-start': 'left top to right top',
	'right-end': 'left bottom to right bottom',
	bottom: 'top to bottom',
	'bottom-start': 'top left to bottom left',
	'bottom-end': 'top right to bottom right',
	left: 'right to left',
	'left-start': 'right top to left top',
	'left-end': 'right bottom to left bottom'
}

export function normalizeSelectMenu(menu: GooSelectMenuOptions | undefined): NormalizedGooSelectMenu {
	return {
		...defaultSelectMenu,
		...menu
	}
}

export function getSelectMenuAlign(menu: NormalizedGooSelectMenu): string {
	return placementAlignments[menu.placement]
}

export function getSelectMenuOffset(menu: NormalizedGooSelectMenu): { x?: number; y?: number } {
	if (menu.offset) {
		return menu.offset
	}
	return menu.variant === 'attached' ? { x: 0, y: 0 } : { x: 0, y: 4 }
}

export function getSelectMenuPopoutClass(menu: NormalizedGooSelectMenu, openClassName?: string): string {
	return [
		'goo-select-popout',
		menu.variant === 'attached' ? 'goo-select-popout--menu-attached' : '',
		menu.outline ? 'goo-select-popout--outlined' : '',
		menu.popoutClassName,
		openClassName
	].filter(Boolean).join(' ')
}

export function applySelectMenuWidth($container: HTMLElement, menu: NormalizedGooSelectMenu, triggerWidth: number | undefined): void {
	$container.classList.toggle('goo-select__options--width-content', menu.width === 'content')
	if (menu.width === 'trigger' && triggerWidth !== undefined) {
		$container.style.width = `${ triggerWidth }px`
		$container.style.minWidth = `${ triggerWidth }px`
		return
	}

	$container.style.removeProperty('width')
	if (menu.width === 'content' && triggerWidth !== undefined) {
		$container.style.minWidth = `${ triggerWidth }px`
		return
	}

	$container.style.removeProperty('min-width')
}
