/// <reference path="../svelte.d.ts" />

export { createGooField, createGooFields } from './createGooField.ts'
export {
	createGooDialog,
	type DialogField,
	type DialogLabels,
	type DialogResult,
	GooDialogController,
	type GooDialogInstance,
	type GooDialogOptions } from './dialog.ts'
export { createGooDialogTextContent, createTrustedGooDialogContent } from './dialogContent.ts'
export {
	GooAlert,
	type GooAlertOptions,
	GooConfirm,
	type GooConfirmOptions,
	type GooDialogTask,
	GooNotify,
	type GooNotifyOptions,
	GooOverlay,
	type GooOverlayOptions,
	GooPrompt,
	type GooPromptOptions
} from './dialogs.ts'
export { default as GooDialog } from './GooDialog.svelte'
export { dialogManager, GooDialogManager } from './GooDialogManager.ts'
