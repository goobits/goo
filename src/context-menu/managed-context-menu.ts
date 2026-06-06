import type { GooSelectOpenOptions } from '../select/index.ts'
import { createGooContextMenu, type GooContextMenuElement, type GooContextMenuOption } from './GooContextMenu.ts'

/** Context menu item accepted by the managed Goo context menu API. */
export type ManagedGooContextMenuItem = GooContextMenuOption | string | '-' | '---'

/** Managed Goo context menu instance. */
export type ManagedGooContextMenu = Omit<GooContextMenuElement, 'close' | 'open'> & {
	close(options?: { quiet?: boolean }): void
	menuOptions: GooContextMenuOption[]
	on(eventName: string, handler: (...args: unknown[]) => void): () => void
	open(options?: ManagedGooContextMenuOpenOptions): boolean
}

/** Options for the managed Goo context menu API. */
export interface ManagedGooContextMenuOptions {
	at?: unknown
	boundContext?: unknown
	enableKeyboard?: boolean
	id?: string
	items?: ManagedGooContextMenuItem[] | Record<string, unknown>
	menu?: Record<string, unknown>
	onChange?: (this: ManagedGooContextMenu, value: string) => void
	onClose?: (this: ManagedGooContextMenu) => void
	onOpen?: (this: ManagedGooContextMenu) => void
	parentElement?: HTMLElement
	selected?: string | number
	showPopoutArrow?: boolean
	showPopoutBackdrop?: boolean
	showSelectionIndicator?: boolean
	value?: string | number
}

type ManagedGooContextMenuOpenOptions = GooSelectOpenOptions & {
	boundContext?: unknown
	onClose?: () => void
	onDestroy?: () => void
	parentElement?: HTMLElement
	x?: number
	y?: number
}

/** Manager for registered Goo context menus. */
export type GooContextMenuManager = {
	/** Close the current context menu, if any. */
	close: typeof close
	/** Return the current open context menu, if any. */
	getCurrent(): ManagedGooContextMenu | undefined
	/** Return a registered context menu by id. */
	get: typeof get
	/** Return the current open context menu id, if any. */
	getOpenedId(): string | undefined
	/** Whether a context menu is currently open. */
	isOpen(): boolean
	/** Open a registered context menu by id or instance. */
	open: typeof open
	/** Register a reusable context menu. */
	register: typeof register
	/** Registered context menus keyed by id. */
	registeredMenus: typeof registeredMenus
}

const contextMenuState: {
	currentMenu?: ManagedGooContextMenu
	id?: string
	opened: boolean
} = {
	opened: false
}
const registeredMenus: Record<string, ManagedGooContextMenu> = {}

/** Registered Goo context menu manager. */
export const GooContextMenu: GooContextMenuManager = {
	close,
	getCurrent,
	get,
	getOpenedId,
	isOpen,
	open,
	register,
	registeredMenus
}

/** Create and immediately open a managed Goo context menu. */
export function createManagedGooContextMenu(options: ManagedGooContextMenuOptions = {}): ManagedGooContextMenu {
	const {
		at,
		id = `ContextMenu-${ Date.now() }`,
		items,
		parentElement
	} = options
	const contextMenu = createRegisteredContextMenu(id, items, options)

	contextMenu.open({
		at: normalizeOpenAt(at),
		parentElement
	})

	return contextMenu
}

function register(
	id: string,
	items: ManagedGooContextMenuItem[] | Record<string, unknown>,
	options: ManagedGooContextMenuOptions = {}
): ManagedGooContextMenu {
	return registeredMenus[id] = createRegisteredContextMenu(id, items, { ...options, id })
}

function get(id: string): ManagedGooContextMenu | undefined {
	return registeredMenus[id]
}

function getCurrent(): ManagedGooContextMenu | undefined {
	return contextMenuState.currentMenu
}

function getOpenedId(): string | undefined {
	return contextMenuState.id
}

function isOpen(): boolean {
	return contextMenuState.opened
}

function open(idOrMenu: ManagedGooContextMenu | string, options: ManagedGooContextMenuOpenOptions = {}): void {
	const contextMenu = typeof idOrMenu === 'string' ? get(idOrMenu) : idOrMenu
	if (!contextMenu || contextMenuState.currentMenu?.id === contextMenu.id) {
		return
	}

	close()
	contextMenu.open(options)
}

function close(): boolean {
	if (!contextMenuState.currentMenu) {
		return false
	}

	contextMenuState.currentMenu.close()
	return true
}

function createRegisteredContextMenu(
	id: string,
	items: ManagedGooContextMenuOptions['items'],
	config: ManagedGooContextMenuOptions = {}
): ManagedGooContextMenu {
	const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
	const menuOptions = normalizeContextMenuItems(items)
	const contextMenu = createGooContextMenu({
		boundContext: config.boundContext,
		className: [ id, 'goo-managed-context-menu' ].join(' '),
		enableKeyboard: config.enableKeyboard,
		id: `goo-contextmenu-${ id }`,
		menu: {
			arrow: config.showPopoutArrow ?? true,
			backdrop: config.showPopoutBackdrop ?? false,
			...config.menu
		},
		options: menuOptions,
		selected: String(config.selected ?? config.value ?? ''),
		showSelectionIndicator: Boolean(config.showSelectionIndicator),
		onclose: markClosed,
		onopen: markOpen
	}) as ManagedGooContextMenu
	let onDestroyCallback: (() => void) | undefined
	let isOpen = false

	contextMenu.id = id
	contextMenu.menuOptions = menuOptions
	contextMenu.on = (eventName, handler) => {
		const handlers = listeners.get(eventName) || new Set()
		handlers.add(handler)
		listeners.set(eventName, handlers)
		return () => {
			handlers.delete(handler)
			if (!handlers.size) listeners.delete(eventName)
		}
	}

	const closeMenu = contextMenu.close.bind(contextMenu)
	contextMenu.close = (options = {}) => {
		const result = closeMenu(options)
		markClosed()
		return result
	}

	const openMenu = contextMenu.open.bind(contextMenu)
	contextMenu.open = (options = {}) => {
		const openOptions = options as ManagedGooContextMenuOpenOptions
		onDestroyCallback = openOptions.onDestroy || openOptions.onClose
		return openMenu({
			...openOptions,
			boundContext: openOptions.boundContext || config.boundContext
		})
	}

	const setValue = contextMenu.setValue.bind(contextMenu)
	contextMenu.setValue = (value, options = {}) => {
		const stringValue = String(value)
		const option = findContextMenuOption(menuOptions, stringValue)
		option?.onChoose?.call(config.boundContext || contextMenu, stringValue)
		return setValue(stringValue, options)
	}

	contextMenu.addEventListener('change', event => {
		const value = (event as CustomEvent<{ value?: string }>).detail?.value ?? contextMenu.getValue?.()
		config.onChange?.call(config.boundContext as ManagedGooContextMenu || contextMenu, String(value))
		markClosed()
	})
	contextMenu.addEventListener('open', markOpen)
	contextMenu.addEventListener('close', markClosed)

	return contextMenu

	function markOpen(): void {
		if (isOpen) return

		isOpen = true
		contextMenuState.currentMenu = contextMenu
		contextMenuState.id = id
		contextMenuState.opened = true
		config.onOpen?.call(config.boundContext as ManagedGooContextMenu || contextMenu)
		emit('open')
	}

	function markClosed(): void {
		if (!isOpen && !contextMenuState.opened) return

		isOpen = false
		const onDestroy = onDestroyCallback
		onDestroyCallback = undefined
		contextMenuState.currentMenu = undefined
		contextMenuState.id = undefined
		contextMenuState.opened = false
		config.onClose?.call(config.boundContext as ManagedGooContextMenu || contextMenu)
		onDestroy?.()
		emit('close')
	}

	function emit(eventName: string, ...args: unknown[]): void {
		for (const handler of listeners.get(eventName) || []) {
			handler(...args)
		}
	}
}

function normalizeContextMenuItems(items: ManagedGooContextMenuOptions['items']): GooContextMenuOption[] {
	if (!items) {
		return []
	}

	if (!Array.isArray(items) && typeof items === 'object') {
		return Object.entries(items).map(([ itemId, label ]) => (
			typeof label === 'object' && !Array.isArray(label)
				? normalizeContextMenuItem({ id: itemId, ...label })
				: normalizeContextMenuItem({ id: itemId, label })
		)).filter(Boolean) as GooContextMenuOption[]
	}

	return items.map(normalizeContextMenuItem).filter(Boolean) as GooContextMenuOption[]
}

function normalizeOpenAt(at: unknown): ManagedGooContextMenuOpenOptions['at'] {
	if (at instanceof HTMLElement) {
		return at
	}

	if (at && typeof at === 'object' && 'x' in at && 'y' in at) {
		const { x, y } = at as { x: unknown; y: unknown }
		if (typeof x === 'number' && typeof y === 'number') {
			return { x, y }
		}
	}

	return undefined
}

function normalizeContextMenuItem(item: ManagedGooContextMenuItem | Record<string, unknown>): GooContextMenuOption | undefined {
	if (!item) return undefined
	if (item === '-' || item === '---') return { type: 'divider' }
	if (typeof item === 'string') {
		return {
			id: item,
			label: item
		}
	}
	const itemRecord = item as Record<string, unknown>
	if (itemRecord.type === 'divider') {
		return {
			isSupported: itemRecord.isSupported as GooContextMenuOption['isSupported'],
			type: 'divider'
		}
	}

	const id = String(itemRecord.id ?? itemRecord.value ?? itemRecord.label ?? '')
	const option: GooContextMenuOption = {
		icon: normalizeIcon(itemRecord.icon),
		id,
		isDisabled: itemRecord.isDisabled as GooContextMenuOption['isDisabled'],
		isSupported: itemRecord.isSupported as GooContextMenuOption['isSupported'],
		label: normalizeLabel(itemRecord.label ?? itemRecord.title ?? itemRecord.value ?? id),
		onChoose: (itemRecord.onChoose || itemRecord.onClick) as GooContextMenuOption['onChoose'],
		shortcut: itemRecord.shortcut as GooContextMenuOption['shortcut'],
		type: itemRecord.type as GooContextMenuOption['type']
	}

	if (itemRecord.options) {
		option.options = normalizeContextMenuItems(itemRecord.options as ManagedGooContextMenuOptions['items'])
	}

	return option
}

function normalizeIcon(icon: unknown): GooContextMenuOption['icon'] {
	if (typeof icon !== 'string') {
		return icon as GooContextMenuOption['icon']
	}

	return icon.includes('/') ? icon.replace(/[^a-zA-Z0-9_-]+/gu, '-') : icon
}

function normalizeLabel(label: unknown): GooContextMenuOption['label'] {
	if (typeof label === 'function') {
		return () => normalizeLabel((label as () => unknown)()) as string | HTMLElement
	}

	if (label instanceof HTMLElement) {
		return label
	}

	return String(label ?? '')
}

function findContextMenuOption(options: GooContextMenuOption[], value: string): GooContextMenuOption | undefined {
	for (const option of options) {
		if (option.id === value) return option
		if (option.options) {
			const match = findContextMenuOption(option.options, value)
			if (match) return match
		}
	}

	return undefined
}
