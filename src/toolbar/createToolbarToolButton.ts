import { flushSync, mount, unmount } from 'svelte'

import type { ToolbarToolButtonConfig } from './toolbarChromeModel.ts'
import ToolbarToolButton from './ToolbarToolButton.svelte'

type ToolbarToolButtonApi = ReturnType<typeof mount> & {
	getRootElement(): HTMLElement | undefined
}

export type ToolbarToolButtonElement = HTMLElement & {
	destroyToolbarToolButton(): void
}

export type CreateToolbarToolButtonOptions = ToolbarToolButtonConfig

export function createToolbarToolButton({
	icon,
	id,
	title
}: CreateToolbarToolButtonOptions): ToolbarToolButtonElement {
	const target = document.createElement('div')
	const component = mount(ToolbarToolButton, {
		target,
		props: {
			icon,
			id,
			title
		}
	}) as ToolbarToolButtonApi

	flushSync()
	const button = component.getRootElement() as ToolbarToolButtonElement | undefined
	if (!button) {
		unmount(component)
		throw new Error('ToolbarToolButton failed to mount.')
	}

	button.destroyToolbarToolButton = (): void => {
		void unmount(component)
	}

	return button
}
