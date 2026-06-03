import { flushSync, mount, unmount } from 'svelte'

import FloatingToolbarView from './FloatingToolbarView.svelte'
import type { FloatingToolbarGroups } from './toolbarChromeModel.ts'

type FloatingToolbarViewApi = ReturnType<typeof mount> & {
	getRootElement(): HTMLElement | undefined
}

export type FloatingToolbarElement = HTMLElement & {
	destroyFloatingToolbarView(): void
}

export type CreateFloatingToolbarViewOptions = {
	toolGroups: FloatingToolbarGroups
}

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

	flushSync()
	const toolbar = component.getRootElement() as FloatingToolbarElement | undefined
	if (!toolbar) {
		unmount(component)
		throw new Error('FloatingToolbarView failed to mount.')
	}

	toolbar.destroyFloatingToolbarView = (): void => {
		void unmount(component)
	}

	return toolbar
}
