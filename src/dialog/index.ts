/// <reference path="../svelte.d.ts" />

export {
	createGooDialog,
	type DialogField,
	type DialogFieldElements,
	type DialogLabels,
	type DialogResult,
	type DialogValues,
	type DialogVerifyHandler,
	type GooDialogDefaultFocus,
	type GooDialogInstance,
	type GooDialogOptions,
	type GooDialogType } from './dialog.ts'
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
