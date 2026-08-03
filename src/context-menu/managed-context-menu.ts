import type { GooPopoutAt } from '../popout/index.ts'
import { findOptionById } from '../select/_normalizeOptions.ts'
import type {
	GooSelectActionContext,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectOptionsInput
} from '../select/index.ts'
import { createLifecycleBag } from '../support/utils/lifecycleBag.ts'
import {
	createGooContextMenu,
	type GooContextMenuElement,
	type GooContextMenuOptions
} from './GooContextMenu.ts'

export type ManagedGooContextMenuOpenAt = HTMLElement | GooPopoutAt
export type ManagedGooContextMenuItems =
	| ManagedGooContextMenuItem[]
	| Record<string, ManagedGooContextMenuObjectItem | string | number>
export type ManagedGooContextMenuItemPredicate = (
	this: ManagedGooContextMenu,
	id: string
) => boolean
export type ManagedGooContextMenuItemAction = (this: ManagedGooContextMenu, id: string) => void
export type ManagedGooContextMenuEventName = 'open' | 'close'
export type ManagedGooContextMenuEventHandler = (this: ManagedGooContextMenu) => void

/** Object item accepted by the managed Goo context menu API before normalization. */
export type ManagedGooContextMenuObjectItem = Omit<
	GooSelectOption,
	'disabled' | 'isSupported' | 'label' | 'onChoose' | 'options'
> & {
	id?: string
	disabled?: boolean | ManagedGooContextMenuItemPredicate
	isSupported?: boolean | ManagedGooContextMenuItemPredicate
	label?: GooSelectOption['label'] | number
	onChoose?: ManagedGooContextMenuItemAction
	options?: ManagedGooContextMenuItem[]
}

/** Context menu item accepted by the managed Goo context menu API. */
export type ManagedGooContextMenuItem = ManagedGooContextMenuObjectItem | string | '-' | '---'

/** Managed Goo context menu instance. */
export type ManagedGooContextMenu = {
	readonly element: GooContextMenuElement
	readonly id: string
	readonly menuOptions: GooSelectOption[]
	close(options?: { quiet?: boolean }): void
	destroy(): void
	getValue(): string
	isOpen(): boolean
	on(
		eventName: ManagedGooContextMenuEventName,
		handler: ManagedGooContextMenuEventHandler
	): () => void
	open(options?: ManagedGooContextMenuOpenOptions): boolean
	setOptions(options: GooSelectOptionsInput): void
	setValue(value: string | number, options?: { silent?: boolean }): void
}

/** Options for the managed Goo context menu API. */
export interface ManagedGooContextMenuOptions {
	at?: ManagedGooContextMenuOpenAt
	actionContext?: GooSelectActionContext
	enableKeyboard?: boolean
	id?: string
	items?: ManagedGooContextMenuItems
	menu?: GooContextMenuOptions['menu']
	onChange?: (this: ManagedGooContextMenu, value: string) => void
	onClose?: (this: ManagedGooContextMenu) => void
	onOpen?: (this: ManagedGooContextMenu) => void
	parentElement?: HTMLElement
	showPopoutArrow?: boolean
	showPopoutBackdrop?: boolean
	showSelectionIndicator?: boolean
	value?: string | number
}

/** Options accepted when opening a managed Goo context menu. */
export type ManagedGooContextMenuOpenOptions = Omit<GooSelectOpenOptions, 'at'> & {
	at?: ManagedGooContextMenuOpenAt
	actionContext?: GooSelectActionContext
	onClose?: () => void
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
	register
}

function register(
	id: string,
	items: ManagedGooContextMenuItems,
	options: ManagedGooContextMenuOptions = {}
): ManagedGooContextMenu {
	registeredMenus[id]?.destroy()
	return (registeredMenus[id] = createRegisteredContextMenu(id, items, { ...options, id }))
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

function open(
	idOrMenu: ManagedGooContextMenu | string,
	options: ManagedGooContextMenuOpenOptions = {}
): void {
	const contextMenu = typeof idOrMenu === 'string' ? get(idOrMenu) : idOrMenu
	if (!contextMenu) {
		return
	}

	if (contextMenu.isOpen() || contextMenuState.currentMenu?.id === contextMenu.id) {
		contextMenu.open(options)
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
	const listeners = new Map<
		ManagedGooContextMenuEventName,
		Set<ManagedGooContextMenuEventHandler>
	>()
	const handleRef: { current?: ManagedGooContextMenu } = {}
	const menuOptions: GooSelectOption[] = []
	const contextMenu = createGooContextMenu({
		actionContext: config.actionContext,
		className: [ id, 'goo-managed-context-menu' ].join(' '),
		enableKeyboard: config.enableKeyboard,
		id: `goo-contextmenu-${ id }`,
		menu: {
			arrow: config.showPopoutArrow ?? true,
			backdrop: config.showPopoutBackdrop ?? false,
			...config.menu
		},
		options: menuOptions,
		value: String(config.value ?? ''),
		showSelectionIndicator: Boolean(config.showSelectionIndicator),
		onclose: markClosed,
		onopen: markOpen
	})
	let onCloseCallback: (() => void) | undefined
	let isOpen = false
	let openNotified = false
	let destroyed = false
	const lifecycle = createLifecycleBag()
	const handle: ManagedGooContextMenu = {
		element: contextMenu,
		id,
		menuOptions,
		close(options = {}) {
			if (destroyed) return
			contextMenu.close(options)
			markClosed()
		},
		destroy() {
			if (destroyed) return
			destroyed = true
			lifecycle.destroy()
			listeners.clear()
			onCloseCallback = undefined
			if (contextMenuState.currentMenu === handle) {
				contextMenuState.currentMenu = undefined
				contextMenuState.id = undefined
				contextMenuState.opened = false
			}
			isOpen = false
			contextMenu.close({ quiet: true })
			contextMenu.destroy()
			if (registeredMenus[id] === handle) {
				delete registeredMenus[id]
			}
		},
		getValue: () => contextMenu.getValue(),
		isOpen: () => contextMenu.isOpen(),
		on(eventName, handler) {
			if (destroyed) return () => undefined
			const handlers = listeners.get(eventName) || new Set()
			handlers.add(handler)
			listeners.set(eventName, handlers)
			return () => {
				handlers.delete(handler)
				if (!handlers.size) listeners.delete(eventName)
			}
		},
		open(options = {}) {
			if (destroyed) return false
			onCloseCallback = options.onClose
			const didOpen = contextMenu.open({
				...options,
				actionContext: options.actionContext || config.actionContext,
				parentElement: options.parentElement ?? config.parentElement
			})
			if (didOpen) armOpen()
			return didOpen
		},
		setOptions: options => {
			if (destroyed) return
			contextMenu.setOptions(options)
		},
		setValue(value, options = {}) {
			if (destroyed) return
			const stringValue = String(value)
			const option = findOptionById(menuOptions, stringValue)
			option?.onChoose?.call(handle, stringValue)
			contextMenu.setValue(stringValue, options)
		}
	}
	handleRef.current = handle
	menuOptions.push(...normalizeContextMenuItems(items, () => getManagedMenuHandle(handleRef)))
	contextMenu.setOptions(menuOptions)

	const handleChange = (event: Event) => {
		const value =
			(event as CustomEvent<{ value?: string }>).detail?.value ?? contextMenu.getValue?.()
		config.onChange?.call(handle, String(value))
		markClosed()
	}
	lifecycle.listen(contextMenu, 'change', handleChange)
	lifecycle.listen(contextMenu, 'open', markOpen)
	lifecycle.listen(contextMenu, 'close', markClosed)

	return handle

	function markOpen(): void {
		if (destroyed || !contextMenu.isOpen()) return

		armOpen()
		if (openNotified) return
		openNotified = true
		config.onOpen?.call(handle)
		emit('open')
	}

	function armOpen(): void {
		if (destroyed) return
		isOpen = true
		contextMenuState.currentMenu = handle
		contextMenuState.id = id
		contextMenuState.opened = true
	}

	function markClosed(): void {
		if (destroyed) return
		const ownsGlobalState = contextMenuState.currentMenu === handle
		if (!isOpen && !openNotified && !ownsGlobalState) return

		isOpen = false
		openNotified = false
		const onClose = onCloseCallback
		onCloseCallback = undefined
		if (ownsGlobalState) {
			contextMenuState.currentMenu = undefined
			contextMenuState.id = undefined
			contextMenuState.opened = false
		}
		config.onClose?.call(handle)
		onClose?.()
		emit('close')
	}

	function emit(eventName: ManagedGooContextMenuEventName): void {
		for (const handler of listeners.get(eventName) || []) {
			handler.call(handle)
		}
	}
}

function getManagedMenuHandle(handleRef: {
	current?: ManagedGooContextMenu
}): ManagedGooContextMenu {
	if (!handleRef.current) {
		throw new Error('Managed Goo context menu handle is not ready.')
	}
	return handleRef.current
}

function normalizeContextMenuItems(
	items: ManagedGooContextMenuOptions['items'],
	getMenu: () => ManagedGooContextMenu
): GooSelectOption[] {
	if (!items) {
		return []
	}

	if (!Array.isArray(items) && typeof items === 'object') {
		return Object.entries(items)
			.map(([ itemId, label ]) =>
				isManagedContextMenuObjectItem(label)
					? normalizeContextMenuItem({ id: itemId, ...label }, getMenu)
					: normalizeContextMenuItem({ id: itemId, label }, getMenu)
			)
			.filter(Boolean) as GooSelectOption[]
	}

	return items
		.map(item => normalizeContextMenuItem(item, getMenu))
		.filter(Boolean) as GooSelectOption[]
}

function isManagedContextMenuObjectItem(
	value: ManagedGooContextMenuObjectItem | string | number
): value is ManagedGooContextMenuObjectItem {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeContextMenuItem(
	item: ManagedGooContextMenuItem,
	getMenu: () => ManagedGooContextMenu
): GooSelectOption | undefined {
	if (!item) return undefined
	if (item === '-' || item === '---') return { type: 'divider' }
	if (typeof item === 'string') {
		return {
			id: item,
			label: item
		}
	}
	const itemRecord = item
	if (itemRecord.type === 'divider') {
		return {
			isSupported: normalizePredicate(itemRecord.isSupported, getMenu, ''),
			type: 'divider'
		}
	}

	const id = String(itemRecord.id ?? itemRecord.label ?? '')
	const option: GooSelectOption = {
		icon: normalizeIcon(itemRecord.icon),
		id,
		disabled: normalizePredicate(itemRecord.disabled, getMenu, id),
		isSupported: normalizePredicate(itemRecord.isSupported, getMenu, id),
		label: normalizeLabel(itemRecord.label ?? id),
		onChoose: normalizeAction(itemRecord.onChoose, getMenu, id),
		shortcut: itemRecord.shortcut as GooSelectOption['shortcut'],
		title: itemRecord.title,
		type: itemRecord.type as GooSelectOption['type']
	}

	if (itemRecord.options) {
		option.options = normalizeContextMenuItems(
			itemRecord.options as ManagedGooContextMenuOptions['items'],
			getMenu
		)
	}

	return option
}

function normalizePredicate(
	predicate: boolean | ManagedGooContextMenuItemPredicate | undefined,
	getMenu: () => ManagedGooContextMenu,
	id: string
): boolean | (() => boolean) | undefined {
	if (typeof predicate !== 'function') return predicate
	return () => predicate.call(getMenu(), id)
}

function normalizeAction(
	action: ManagedGooContextMenuObjectItem['onChoose'],
	getMenu: () => ManagedGooContextMenu,
	id: string
): GooSelectOption['onChoose'] {
	if (!action) return undefined
	return function(this: GooContextMenuElement | ManagedGooContextMenu, value: string) {
		const menu = getMenu()
		const context = this && this !== menu.element ? this : menu
		return action.call(context as ManagedGooContextMenu, value || id)
	}
}

function normalizeIcon(icon: unknown): GooSelectOption['icon'] {
	if (typeof icon !== 'string') {
		return icon as GooSelectOption['icon']
	}

	return icon.includes('/') ? icon.replace(/[^a-zA-Z0-9_-]+/gu, '-') : icon
}

function normalizeLabel(label: unknown): GooSelectOption['label'] {
	if (typeof label === 'function') {
		return () => normalizeLabel((label as () => unknown)()) as string | HTMLElement
	}

	if (label instanceof HTMLElement) {
		return label
	}

	return String(label ?? '')
}
