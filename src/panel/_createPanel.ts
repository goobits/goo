import { flushSync, mount, unmount } from 'svelte'

import { createFolder, type GooFolderElement, type GooFolderOptions } from '../folder/_createFolder.ts'
import type { ChildContainerHost } from '../support/utils/_childContainer.ts'
import GooPanelComponent from './GooPanel.svelte'

/**
 * Options for creating a programmatic Goo panel host.
 */
export interface GooPanelOptions {
	title?: string
	open?: boolean
	closed?: boolean
	draggable?: boolean
	collapsible?: boolean
	showHeader?: boolean
	docked?: boolean
	width?: number
	position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
	autoPlace?: boolean
	class?: string
	className?: string
	style?: string
	content?: string | HTMLElement | Node
	parentElement?: HTMLElement
	onchange?: (value: boolean, oldValue?: boolean) => void
}

/**
 * Native element API exposed by mounted Goo panels.
 */
export type GooPanelElement = HTMLDivElement & {
	headerElement: HTMLElement | null
	titleElement: HTMLElement | null
	toggleElement: HTMLElement | null
	contentElement: HTMLElement | null
	open: boolean
	closed: boolean
	title: string
	width: number
	docked: boolean
	setOpen: (value: boolean, options?: { silent?: boolean }) => void
	toggle: () => boolean
	expand: () => void
	collapse: () => void
	close: () => void
	add: <T extends HTMLElement>(element: T) => T
	addContent: <T extends HTMLElement>(element: T) => T
	addFolder: (title: string, options?: GooFolderOptions) => GooFolderElement
	removeElement: (element: HTMLElement) => boolean
	clear: () => void
	destroy: () => void
}

/** Internal mounted panel shape used by GooPanel.svelte and child container helpers. */
export type GooPanelInternalElement = GooPanelElement & ChildContainerHost

type MountedPanel = ReturnType<typeof mount>

/**
 * Creates panel.
 *
 * @param options - options.
 */
export function createPanel(options: GooPanelOptions = {}): GooPanelElement {
	const target = document.createElement('div')
	let element: GooPanelElement | null = null
	let instance: MountedPanel | null = null

	instance = mount(GooPanelComponent, {
		target,
		props: {
			...options,
			onelement: nextElement => {
				element = nextElement
			},
			createFolder
		}
	})
	flushSync()

	const panel = element ?? target.querySelector<GooPanelElement>('.goo-panel')
	if (!panel) {
		if (instance) unmount(instance)
		throw new Error('GooPanel did not mount a root element')
	}

	const originalDestroy = panel.destroy
	panel.destroy = () => {
		originalDestroy()
		if (instance) {
			unmount(instance)
			instance = null
		}
	}

	const shouldAutoPlace = options.autoPlace ?? !options.docked
	if (shouldAutoPlace && !options.parentElement && !panel.parentElement) {
		document.body.appendChild(panel)
	}
	if (options.parentElement) options.parentElement.appendChild(panel)

	return panel
}
