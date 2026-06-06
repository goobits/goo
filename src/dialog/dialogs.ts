/**
 * @fileoverview Convenience functions for common dialog types.
 * @module goobits/dialog/dialogs
 */

import { createGooDialog, type DialogField, type DialogLabels, type DialogResult, type GooDialogInstance } from './dialog.ts'

/** Task returned by dialog convenience helpers. */
export type GooDialogTask = {
	/** Public dialog controller. */
	readonly dialog: GooDialogInstance
	/** Resolves with the user's dialog action. */
	readonly result: Promise<DialogResult>
	/** Close the dialog. */
	close(): void
	/** Destroy the dialog. */
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

function createDialogTask(dialog: GooDialogInstance): GooDialogTask {
	const result = dialog.open()
	return {
		dialog,
		result,
		close: () => void dialog.close(),
		destroy: () => void dialog.close()
	}
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
 * @returns Dialog task containing the result promise and controller.
 */
export function GooAlert(options: GooAlertOptions | string): GooDialogTask {
	const normalized = normalizeContentOptions<GooAlertOptions>(options)
	const dialog = createGooDialog({
		type: 'alert',
		showClose: true,
		...normalized
	})

	return createDialogTask(dialog)
}

/**
 * Show a confirmation dialog with OK/Cancel buttons.
 *
 * @param options - Options or message string.
 * @returns Dialog task containing the result promise and controller.
 */
export function GooConfirm(options: GooConfirmOptions | string): GooDialogTask {
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

	return createDialogTask(dialog)
}

/**
 * Show a prompt dialog with form fields.
 *
 * @param options - Prompt options.
 * @returns Dialog task containing the result promise and controller.
 */
export function GooPrompt(options: GooPromptOptions): GooDialogTask {
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

	return createDialogTask(dialog)
}

/**
 * Show a notification banner.
 *
 * @param options - Options or message string.
 * @returns Dialog task containing the result promise and controller.
 */
export function GooNotify(options: GooNotifyOptions | string): GooDialogTask {
	const normalized = normalizeContentOptions<GooNotifyOptions>(options)
	const dialog = createGooDialog({
		type: 'notify',
		showBackdrop: false,
		showClose: true,
		closeOnEscape: true,
		autoDismiss: normalized.autoDismiss ?? 5000,
		...normalized
	})

	return createDialogTask(dialog)
}

/**
 * Show a full-screen overlay dialog.
 *
 * @param options - Options, message, or node.
 * @returns Dialog task containing the result promise and controller.
 */
export function GooOverlay(options: GooOverlayOptions | string | Node): GooDialogTask {
	const normalized = normalizeContentOptions<GooOverlayOptions>(options)
	const dialog = createGooDialog({
		type: 'overlay',
		showClose: true,
		...normalized
	})

	return createDialogTask(dialog)
}
