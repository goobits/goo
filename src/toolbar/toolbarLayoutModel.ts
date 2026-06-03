/**
 * Position where a toolbar is docked relative to its workspace.
 */
export type ToolbarPosition = 'bottom' | 'left' | 'right' | 'top'

/**
 * Tool entry used when normalizing toolbar command groups.
 */
export type ToolbarToolEntry = {
	className?: string
	dataset?: Record<string, string>
	icon?: string | (() => HTMLElement)
	id: string
	linkedAs?: string
	title?: string
	toolGroup?: string
	tooltip?: string | (() => string)
	transient?: boolean
}

/**
 * Normalized toolbar button groups keyed by visual placement.
 */
export type ToolbarButtonLayout = {
	bottom?: ToolbarToolEntry[]
	middle?: ToolbarToolEntry[]
	top?: ToolbarToolEntry[]
}

/**
 * Toolbar configuration accepted by the shared layout normalizer.
 */
export type ToolbarConfig = {
	bottom?: ToolbarToolEntry[]
	className?: string
	mirrorInRTL?: boolean
	position?: ToolbarPosition
	primaryCommands?: Array<string | ToolbarToolEntry>
	secondaryCommands?: Array<string | ToolbarToolEntry>
	top?: ToolbarToolEntry[]
}

/**
 * Compactness mode chosen from the available toolbar space.
 */
export type ToolbarLayoutMode = 'showAll' | 'shrinkBottom' | 'scrollTopShrinkBottom'

/**
 * Converts a toolbar config into normalized top, middle, and bottom button groups.
 */
export function toToolbarButtonLayout(
	config: ToolbarConfig,
	transformToolConfig: (toolConfig: string | ToolbarToolEntry) => ToolbarToolEntry
): ToolbarButtonLayout {
	const { top, bottom } = config

	if (top || bottom) {
		return {
			top: top || [],
			bottom: bottom || []
		}
	}

	return {
		top: (config.primaryCommands || []).map(transformToolConfig),
		middle: [],
		bottom: (config.secondaryCommands || []).map(transformToolConfig)
	}
}

/**
 * Returns whether a toolbar position lays out controls horizontally.
 */
export function isToolbarHorizontalPosition(position: ToolbarPosition | string | undefined): boolean {
	return position === 'top' || position === 'bottom'
}

/**
 * Creates a stable signature from the visible toolbar entries.
 */
export function getToolbarLayoutSignature(buttonLayout: ToolbarButtonLayout): string {
	return Object.values(buttonLayout)
		.flat()
		.map(toolEntry => toolEntry.id)
		.join(',')
}

/**
 * Chooses the compact layout mode that fits the current toolbar space.
 */
export function chooseToolbarLayout({
	buttonSize,
	mainSize,
	primaryCount,
	secondaryCount
}: {
	buttonSize: number
	mainSize: number
	primaryCount: number
	secondaryCount: number
}): ToolbarLayoutMode {
	const primarySize = primaryCount * buttonSize
	const secondarySize = secondaryCount * buttonSize

	if (mainSize > primarySize + secondarySize) {
		return 'showAll'
	}

	if (mainSize > primarySize + buttonSize) {
		return 'shrinkBottom'
	}

	return 'scrollTopShrinkBottom'
}
