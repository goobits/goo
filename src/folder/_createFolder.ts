import { flushSync, mount, unmount } from 'svelte'

import type { ChildContainerHost } from '../support/utils/_childContainer.ts'
import GooFolderComponent from './GooFolder.svelte'

/**
 * Options for creating a programmatic Goo folder host.
 */
export interface GooFolderOptions {
	title?: string
	open?: boolean
	tabIndex?: number
	disabled?: boolean
	class?: string
	className?: string
	style?: string
	content?: string | HTMLElement | Node
	onadd?: (child: HTMLElement) => void
	onchange?: (value: boolean, oldValue?: boolean) => void
}

/**
 * Native element API exposed by mounted Goo folders.
 */
export type GooFolderElement = HTMLDivElement & {
	headerElement: HTMLElement | null
	titleElement: HTMLElement | null
	contentElement: HTMLElement | null
	chevronElement: HTMLElement | null
	open: boolean
	title: string
	setOpen: (value: boolean, options?: { silent?: boolean }) => void
	toggle: () => boolean
	expand: () => void
	collapse: () => void
	add: <T extends HTMLElement>(element: T) => T
	addFolder: (title: string, options?: GooFolderOptions) => GooFolderElement
	removeElement: (element: HTMLElement) => boolean
	clear: () => void
}

/** Internal mounted folder shape used by GooFolder.svelte and child container helpers. */
export type GooFolderInternalElement = GooFolderElement & ChildContainerHost

type MountedFolder = ReturnType<typeof mount>

/**
 * Creates folder.
 *
 * @param options - options.
 */
export function createFolder(options: GooFolderOptions = {}): GooFolderElement {
	const target = document.createElement('div')
	let element: GooFolderElement | null = null
	const instance: MountedFolder = mount(GooFolderComponent, {
		target,
		props: {
			...options,
			onelement: nextElement => {
				element = nextElement
			},
			createFolder: childOptions => createFolder(childOptions)
		}
	})
	flushSync()

	const folder = element ?? target.querySelector<GooFolderElement>('.goo-folder')
	if (!folder) {
		if (instance) unmount(instance)
		throw new Error('GooFolder did not mount a root element')
	}

	return folder
}
