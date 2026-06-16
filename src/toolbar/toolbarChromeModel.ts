export type ToolbarIconFactory = () => HTMLElement
export type ToolbarChromeIcon = string | ToolbarIconFactory

export type ToolbarToolButtonConfig = {
	icon?: ToolbarChromeIcon
	id: string
	title?: string
}

export type FloatingToolbarToolConfig = {
	affordanceId?: string
	affordanceKind?: 'modifier' | 'quick-tool'
	affordanceModifier?: string
	affordanceOwnerIds?: readonly string[]
	affordanceQuickToolId?: string
	disabled?: boolean
	exec: string
	icon: ToolbarChromeIcon
	id?: string
	tooltip: string
}

export type FloatingToolbarGroups = Record<string, FloatingToolbarToolConfig[]>

export const TOOLBAR_CHROME_ACTIVE_TOOL_ID = 'pencil'

export const TOOLBAR_CHROME_BANNER_APPS = [
	'Color Piano',
	'Be Here Meow',
	'Color Sphere',
	'Sand Art',
	'Zendala'
] as const

export function readFloatingToolbarGroups(toolGroups: FloatingToolbarGroups): FloatingToolbarToolConfig[][] {
	return Object.values(toolGroups)
}
