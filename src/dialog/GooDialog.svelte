<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'
import { useGooOverlayHost } from '../overlay-host/overlayHost.ts'
import { createGooDialog } from './dialog.ts'
import type { GooDialogInstance, GooDialogOptions, DialogResult } from './dialog.ts'

type GooDialogProps = Omit<
	GooDialogOptions,
	'actions' | 'content' | 'onOk' | 'onCancel' | 'onClose'
> & {
	open?: boolean
	actions?: Snippet
	children?: Snippet
	instance?: GooDialogInstance | null
	onok?: (result: DialogResult) => void
	oncancel?: (result: DialogResult) => void
	onclose?: () => void
}

let contentElement: HTMLDivElement | undefined = $state()
let actionsElement: HTMLDivElement | undefined = $state()
let currentDialog: GooDialogInstance | null = null
let mounted = false
const overlayHost = useGooOverlayHost()

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
	actions,
	parentElement,
	isolationRoot,
	children,
	instance = $bindable<GooDialogInstance | null>(null),
	onok,
	oncancel,
	onclose
}: GooDialogProps = $props()

let rendered = $state(Boolean(open))

function createDialog(): void {
	if (!contentElement) return
	if (actions && !actionsElement) return
	if (currentDialog) return
	contentElement.hidden = false
	if (actions && actionsElement) actionsElement.hidden = false
	currentDialog = createGooDialog({
		type,
		ariaLabel,
		heading,
		content: contentElement,
		actions: actions ? actionsElement : undefined,
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
		parentElement: parentElement ?? overlayHost?.element() ?? undefined,
		isolationRoot: isolationRoot ?? overlayHost?.scope() ?? undefined,
		onOk: onok,
		onCancel: oncancel,
		onClose: () => {
			open = false
			rendered = false
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
		void currentDialog?.destroy()
		currentDialog = null
		instance = null
		if (mountedContent === element) mountedContent = undefined
	}
})

$effect(() => {
	if (!mounted || !currentDialog) return
	if (open) rendered = true
	if (open && !currentDialog.isOpen) void currentDialog.open()
	if (!open && currentDialog.isOpen) void currentDialog.close()
})

$effect(() => {
	const nextHeading = heading
	if (!mounted || !currentDialog) return
	currentDialog.setHeading(nextHeading)
})
</script>

<div bind:this={contentElement} hidden>
	{#if rendered && children}
		{@render children()}
	{/if}
</div>

<div bind:this={actionsElement} class="goo-dialog__actions" hidden>
	{#if rendered && actions}
		{@render actions()}
	{/if}
</div>
