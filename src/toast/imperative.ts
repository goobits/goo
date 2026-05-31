import { mount, unmount } from 'svelte'

import GooToaster from './GooToaster.svelte'
import { toast } from './toast-service.svelte.ts'
import type { ToastOptions } from './types.ts'

/** Handle returned by imperative Goo toast helpers. */
export interface GooToastHandle {
	/** Toast id in the shared Goo toast store. */
	id: string
	/** Dismisses the toast. */
	close(): void
	/** Updates the toast title in place. */
	setMessage(message: string): void
}

let toaster: ReturnType<typeof mount> | null = null
let toasterTarget: HTMLElement | null = null

/** Ensures the shared Goo toaster is mounted for imperative callers. */
export function ensureGooToaster(): void {
	if (toaster || typeof document === 'undefined') return

	toasterTarget = document.createElement('div')
	toasterTarget.className = 'goo-toaster-host'
	document.body.append(toasterTarget)
	toaster = mount(GooToaster, { target: toasterTarget })
}

/** Unmounts the shared imperative Goo toaster. */
export function destroyGooToaster(): void {
	if (!toaster) return

	unmount(toaster)
	toaster = null
	toasterTarget?.remove()
	toasterTarget = null
}

/** Shows a Goo toast. */
export function showGooToast(content: string | HTMLElement, options: ToastOptions | number = {}): GooToastHandle {
	ensureGooToaster()
	const id = toast.show(normalizeToastContent(content), normalizeToastOptions(options))
	return createHandle(id)
}

/** Shows a Goo success toast. */
export function showGooToastSuccess(content: string | HTMLElement, options: ToastOptions | number = {}): GooToastHandle {
	ensureGooToaster()
	const id = toast.success(normalizeToastContent(content), normalizeToastOptions(options))
	return createHandle(id)
}

/** Shows a Goo warning toast. */
export function showGooToastWarning(content: string | HTMLElement, options: ToastOptions | number = {}): GooToastHandle {
	ensureGooToaster()
	const id = toast.warning(normalizeToastContent(content), normalizeToastOptions(options))
	return createHandle(id)
}

/** Shows a Goo error toast. */
export function showGooToastError(content: string | HTMLElement, options: ToastOptions | number = {}): GooToastHandle {
	ensureGooToaster()
	const id = toast.error(normalizeToastContent(content), normalizeToastOptions(options))
	return createHandle(id)
}

function createHandle(id: string): GooToastHandle {
	return {
		id,
		close() {
			toast.dismiss(id)
		},
		setMessage(message: string) {
			toast.update(id, message)
		}
	}
}

function normalizeToastContent(content: string | HTMLElement): string {
	if (typeof content === 'string') return content
	return content.textContent ?? ''
}

function normalizeToastOptions(options: ToastOptions | number): ToastOptions {
	if (typeof options === 'number') return { duration: options }
	return options
}
