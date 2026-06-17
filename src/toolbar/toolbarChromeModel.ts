export type ToolbarIconFactory = () => HTMLElement
/** Toolbar Chrome Icon typed model for floating toolbars. */
export type ToolbarChromeIcon = string | ToolbarIconFactory

/** Toolbar Tool Button Config typed model for floating toolbars. */
export type ToolbarToolButtonConfig = {
	icon?: ToolbarChromeIcon
	id: string
	title?: string
}

/** Floating Toolbar Tool Config typed model for floating toolbars. */
export type FloatingToolbarToolConfig = {
	disabled?: boolean
	exec: string
	icon: ToolbarChromeIcon
	id?: string
	tooltip: string
}

/** Floating Toolbar Groups typed model for floating toolbars. */
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
