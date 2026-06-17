import { flushSync, mount, unmount } from 'svelte'

import type { GooDisposableElement } from '../support/types/elementHandles.ts'
import FloatingToolbarView from './FloatingToolbarView.svelte'
import type { FloatingToolbarGroups } from './toolbarChromeModel.ts'

type FloatingToolbarViewApi = ReturnType<typeof mount> & {
	getRootElement(): HTMLElement | undefined
}

/** Floating Toolbar Element typed model for floating toolbars. */
export type FloatingToolbarElement = GooDisposableElement

/** Create Floating Toolbar View Options typed model for floating toolbars. */
export type CreateFloatingToolbarViewOptions = {
	toolGroups: FloatingToolbarGroups
}

/** Creates floating toolbar view for floating toolbars. */
export function createFloatingToolbarView({
	toolGroups
}: CreateFloatingToolbarViewOptions): FloatingToolbarElement {
	const target = document.createElement('div')
	const component = mount(FloatingToolbarView, {
		target,
		props: {
			toolGroups
		}
	}) as FloatingToolbarViewApi
	let destroyed = false

	flushSync()
	const toolbar = component.getRootElement() as FloatingToolbarElement | undefined
	if (!toolbar) {
		unmount(component)
		throw new Error('FloatingToolbarView failed to mount.')
	}

	toolbar.destroy = (): void => {
		if (destroyed) return
		destroyed = true
		void unmount(component)
	}

	return toolbar
}
