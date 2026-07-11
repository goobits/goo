<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'
import { createGooDialog } from './dialog.ts'
import type { GooDialogInstance, GooDialogOptions, DialogResult } from './dialog.ts'

type GooDialogProps = Omit<GooDialogOptions, 'content' | 'onOk' | 'onCancel' | 'onClose'> & {
	open?: boolean
	children?: Snippet
	instance?: GooDialogInstance | null
	onok?: (result: DialogResult) => void
	oncancel?: (result: DialogResult) => void
	onclose?: () => void
}

let contentElement: HTMLDivElement | undefined = $state()
let currentDialog: GooDialogInstance | null = null
let mounted = false

let {
	open = $bindable(false),
	type = 'alert',
	ariaLabel,
	heading = '',
	labels,
	fields,
	verify,
	modal = true,
	overlap = false,
	showBackdrop = true,
	showClose = true,
	closeOnBackdrop = true,
	closeOnEscape = true,
	defaultFocus = 'ok',
	width = 'auto',
	height = 'auto',
	className,
	autoDismiss = 0,
	children,
	instance = $bindable<GooDialogInstance | null>(null),
	onok,
	oncancel,
	onclose
}: GooDialogProps = $props()

function createDialog(): void {
	if (!contentElement) return
	if (currentDialog) return
	contentElement.hidden = false
	currentDialog = createGooDialog({
		type,
		ariaLabel,
		heading,
		content: contentElement,
		labels,
		fields,
		verify,
		modal,
		overlap,
		showBackdrop,
		showClose,
		closeOnBackdrop,
		closeOnEscape,
		defaultFocus,
		width,
		height,
		className,
		autoDismiss,
		onOk: onok,
		onCancel: oncancel,
		onClose: () => {
			open = false
			onclose?.()
		}
	})
	instance = currentDialog
	if (open) void currentDialog.open()
}

let mountedContent: HTMLDivElement | undefined

$effect(() => {
	const element = contentElement
	if (!element || mountedContent === element) return
	mountedContent = element
	untrack(createDialog)
	mounted = true
	return () => {
		void currentDialog?.close()
		currentDialog = null
		instance = null
		if (mountedContent === element) mountedContent = undefined
	}
})

$effect(() => {
	if (!mounted || !currentDialog) return
	if (open && !currentDialog.isOpen) void currentDialog.open()
	if (!open && currentDialog.isOpen) void currentDialog.close()
})
</script>

<div bind:this={contentElement} hidden>
	{#if children}
		{@render children()}
	{/if}
</div>
