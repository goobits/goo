import { flushSync, mount, unmount } from 'svelte'

import type { GooDisposableElement } from '../support/types/elementHandles.ts'
import type { ToolbarToolButtonConfig } from './toolbarChromeModel.ts'
import ToolbarToolButton from './ToolbarToolButton.svelte'

type ToolbarToolButtonApi = ReturnType<typeof mount> & {
	getRootElement(): HTMLElement | undefined
}

export type ToolbarToolButtonElement = GooDisposableElement

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
	let destroyed = false

	flushSync()
	const button = component.getRootElement() as ToolbarToolButtonElement | undefined
	if (!button) {
		unmount(component)
		throw new Error('ToolbarToolButton failed to mount.')
	}

	button.destroy = (): void => {
		if (destroyed) return
		destroyed = true
		void unmount(component)
	}

	return button
}
