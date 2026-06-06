/**
 * @fileoverview Convenience functions for common dialog types.
 * @module goobits/dialog/dialogs
 */

import { createGooDialog, type DialogField, type DialogLabels, type DialogResult, type GooDialogInstance } from './dialog.ts'

/** Promise returned by dialog convenience helpers. */
export type GooDialogPromise = Promise<DialogResult> & {
	$dialog: GooDialogInstance
	close(): void
	destroy(): void
}

/** Options accepted by `GooAlert`. */
export interface GooAlertOptions {
	className?: string
	content: string | Node
	heading?: string
	showClose?: boolean
}

/** Options accepted by `GooConfirm`. */
export interface GooConfirmOptions {
	className?: string
	content: string | Node
	defaultFocus?: 'ok' | 'cancel'
	heading?: string
	labels?: DialogLabels
}

/** Options accepted by `GooPrompt`. */
export interface GooPromptOptions {
	className?: string
	content?: string | Node
	defaultFocus?: 'ok' | 'cancel'
	fields: DialogField[]
	heading?: string
	labels?: DialogLabels
	verify?: (values: Record<string, unknown>, fieldElements: Map<string, HTMLElement>) => boolean | Promise<boolean>
}

/** Options accepted by `GooNotify`. */
export interface GooNotifyOptions {
	autoDismiss?: number
	className?: string
	content: string | Node
	showClose?: boolean
}

/** Options accepted by `GooOverlay`. */
export interface GooOverlayOptions {
	ariaLabel?: string
	className?: string
	content: string | Node
	heading?: string
	showClose?: boolean
}

type ContentOptions = { content: string | Node }

function wrapDialogPromise(dialog: GooDialogInstance): GooDialogPromise {
	const promise = dialog.open() as GooDialogPromise
	promise.destroy = () => dialog.close()
	promise.close = () => dialog.close()
	promise.$dialog = dialog
	return promise
}

function normalizeContentOptions<T extends ContentOptions>(
	options: T | T['content']
): T {
	if (typeof options === 'string' || isNode(options)) {
		return { content: options } as T
	}
	return options as T
}

function isNode(value: unknown): value is Node {
	return typeof Node !== 'undefined' && value instanceof Node
}

/**
 * Show a simple alert dialog.
 *
 * @param options - Options or message string.
 * @returns Promise with dialog control methods attached.
 */
export function GooAlert(options: GooAlertOptions | string): GooDialogPromise {
	const normalized = normalizeContentOptions<GooAlertOptions>(options)
	const dialog = createGooDialog({
		type: 'alert',
		showClose: true,
		...normalized
	})

	return wrapDialogPromise(dialog)
}

/**
 * Show a confirmation dialog with OK/Cancel buttons.
 *
 * @param options - Options or message string.
 * @returns Promise with dialog control methods attached.
 */
export function GooConfirm(options: GooConfirmOptions | string): GooDialogPromise {
	const normalized = normalizeContentOptions<GooConfirmOptions>(options)
	const dialog = createGooDialog({
		type: 'confirm',
		labels: {
			ok: 'OK',
			cancel: 'Cancel',
			...normalized.labels
		},
		defaultFocus: 'ok',
		...normalized
	})

	return wrapDialogPromise(dialog)
}

/**
 * Show a prompt dialog with form fields.
 *
 * @param options - Prompt options.
 * @returns Promise with dialog control methods attached.
 */
export function GooPrompt(options: GooPromptOptions): GooDialogPromise {
	const dialog = createGooDialog({
		type: 'prompt',
		labels: {
			ok: 'OK',
			cancel: 'Cancel',
			...options.labels
		},
		defaultFocus: 'ok',
		...options
	})

	return wrapDialogPromise(dialog)
}

/**
 * Show a notification banner.
 *
 * @param options - Options or message string.
 * @returns Promise with dialog control methods attached.
 */
export function GooNotify(options: GooNotifyOptions | string): GooDialogPromise {
	const normalized = normalizeContentOptions<GooNotifyOptions>(options)
	const dialog = createGooDialog({
		type: 'notify',
		showBackdrop: false,
		showClose: true,
		closeOnEscape: true,
		autoDismiss: normalized.autoDismiss ?? 5000,
		...normalized
	})

	return wrapDialogPromise(dialog)
}

/**
 * Show a full-screen overlay dialog.
 *
 * @param options - Options, message, or node.
 * @returns Promise with dialog control methods attached.
 */
export function GooOverlay(options: GooOverlayOptions | string | Node): GooDialogPromise {
	const normalized = normalizeContentOptions<GooOverlayOptions>(options)
	const dialog = createGooDialog({
		type: 'overlay',
		showClose: true,
		...normalized
	})

	return wrapDialogPromise(dialog)
}
