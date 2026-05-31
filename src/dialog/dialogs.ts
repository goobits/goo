/**
 * @fileoverview Convenience functions for common dialog types.
 * Provides alert, confirm, prompt, notify, and overlay helpers.
 * @module goobits/dialog/dialogs
 */

import { createGooDialog } from './dialog.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Extended promise with dialog control methods.
 * @typedef {Promise<DialogResult> & { destroy: () => void, close: () => void, $dialog: import('./dialog.js').GooDialogInstance }} DialogPromise
 */

// ============================================================================
// Helper
// ============================================================================

/**
 * Wraps a dialog's open() promise with destroy/close methods.
 * @param {import('./dialog.js').GooDialogInstance} dialog - The dialog instance
 * @returns {DialogPromise} Promise with destroy/close methods attached
 */
function wrapDialogPromise(dialog) {
	const promise = dialog.open()
	return Object.assign(promise, {
		destroy: () => dialog.close(),
		close: () => dialog.close(),
		$dialog: dialog
	})
}

/**
 * @typedef {import('./dialog.js').DialogResult} DialogResult
 * @typedef {import('./dialog.js').DialogLabels} DialogLabels
 * @typedef {import('./dialog.js').DialogField} DialogField
 */

/**
 * @typedef {Object} AlertOptions
 * @property {string|HTMLElement} content - Alert message
 * @property {string} [heading] - Dialog title
 * @property {string} [className] - Additional CSS class
 * @property {boolean} [showClose=true] - Show close button
 */

/**
 * @typedef {Object} ConfirmOptions
 * @property {string|HTMLElement} content - Confirm message
 * @property {string} [heading] - Dialog title
 * @property {DialogLabels} [labels] - Button labels
 * @property {'ok'|'cancel'} [defaultFocus='ok'] - Default focused button
 * @property {string} [className] - Additional CSS class
 */

/**
 * @typedef {Object} PromptOptions
 * @property {string|HTMLElement} [content] - Optional message above fields
 * @property {string} [heading] - Dialog title
 * @property {DialogField[]} fields - Form fields
 * @property {DialogLabels} [labels] - Button labels
 * @property {Function} [verify] - Validation function
 * @property {'ok'|'cancel'} [defaultFocus='ok'] - Default focused button
 * @property {string} [className] - Additional CSS class
 */

/**
 * @typedef {Object} NotifyOptions
 * @property {string|HTMLElement} content - Notification message
 * @property {number} [autoDismiss=5000] - Auto-dismiss after ms (0 = manual)
 * @property {boolean} [showClose=true] - Show close button
 * @property {string} [className] - Additional CSS class
 */

/**
 * @typedef {Object} OverlayOptions
 * @property {string|HTMLElement} content - Overlay content
 * @property {string} [heading] - Dialog title
 * @property {boolean} [showClose=true] - Show close button
 * @property {string} [className] - Additional CSS class
 */

/**
 * Show a simple alert dialog.
 * @param {AlertOptions|string} options - Options or message string
 * @returns {Promise<DialogResult>}
 * @example
 * await GooAlert('File saved successfully!')
 * await GooAlert({ content: 'Error occurred', heading: 'Error' })
 */
export function GooAlert(options) {
	if (typeof options === 'string') {
		options = { content: options }
	}

	const dialog = createGooDialog({
		type: 'alert',
		showClose: true,
		...options
	})

	return wrapDialogPromise(dialog)
}

/**
 * Show a confirmation dialog with OK/Cancel buttons.
 * @param {ConfirmOptions|string} options - Options or message string
 * @returns {Promise<DialogResult>}
 * @example
 * const { ok } = await GooConfirm('Delete this file?')
 * if (ok) { ... }
 */
export function GooConfirm(options) {
	if (typeof options === 'string') {
		options = { content: options }
	}

	const dialog = createGooDialog({
		type: 'confirm',
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
 * Show a prompt dialog with form fields.
 * @param {PromptOptions} options - Prompt options with fields
 * @returns {Promise<DialogResult>}
 * @example
 * const { ok, values } = await GooPrompt({
 *   heading: 'Enter Details',
 *   fields: [
 *     { type: 'text', name: 'name', label: 'Name', value: '' },
 *     { type: 'number', name: 'age', label: 'Age', min: 0, max: 120 }
 *   ]
 * })
 * if (ok) {
 *   console.log(values.name, values.age)
 * }
 */
export function GooPrompt(options) {
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
 * Show a notification banner at the top of the screen.
 * @param {NotifyOptions|string} options - Options or message string
 * @returns {Promise<DialogResult>}
 * @example
 * GooNotify('Document saved!')
 * GooNotify({ content: 'Connection lost', autoDismiss: 0 })
 */
export function GooNotify(options) {
	if (typeof options === 'string') {
		options = { content: options }
	}

	const dialog = createGooDialog({
		type: 'notify',
		showBackdrop: false,
		showClose: true,
		closeOnEscape: true,
		autoDismiss: options.autoDismiss ?? 5000,
		...options
	})

	return wrapDialogPromise(dialog)
}

/**
 * Show a full-screen overlay dialog.
 * @param {OverlayOptions|string|HTMLElement} options - Options, message, or element
 * @returns {Promise<DialogResult>}
 * @example
 * const overlay = GooOverlay({ content: myCustomElement, heading: 'Settings' })
 */
export function GooOverlay(options) {
	if (typeof options === 'string' || options instanceof HTMLElement) {
		options = { content: options }
	}

	const dialog = createGooDialog({
		type: 'overlay',
		showClose: true,
		...options
	})

	return wrapDialogPromise(dialog)
}
