<script lang="ts">
import { untrack } from 'svelte'
import type { Snippet } from 'svelte'
import { useGooOverlayHost } from '../overlay-host/overlayHost.ts'
import { createGooDialog } from './dialog.ts'
import type { DialogResult, GooDialogController, GooDialogOptions } from './dialog.ts'

type GooDialogProps = Omit<
	GooDialogOptions,
	'actions' | 'content' | 'onOk' | 'onCancel' | 'onClose'
> & {
	open?: boolean
	actions?: Snippet
	children?: Snippet
	instance?: GooDialogController | null
	onok?: (result: DialogResult) => void
	oncancel?: (result: DialogResult) => void
	onclose?: () => void
}

let contentElement: HTMLDivElement | undefined = $state()
let actionsElement: HTMLDivElement | undefined = $state()
let currentDialog: GooDialogController | null = null
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
	defaultFocus,
	side = 'end',
	width = 'auto',
	height = 'auto',
	className,
	autoDismiss = 0,
	actions,
	parentElement,
	isolationRoot,
	children,
	instance = $bindable<GooDialogController | null>(null),
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
	const dialogOptions: GooDialogOptions = {
		type,
		heading,
		content: contentElement,
		modal,
		overlap,
		showBackdrop,
		showClose,
		closeOnBackdrop,
		closeOnEscape,
		...(defaultFocus === undefined ? {} : { defaultFocus }),
		side,
		width,
		height,
		autoDismiss,
		onClose: () => {
			open = false
			rendered = false
			onclose?.()
		}
	}
	if (ariaLabel !== undefined) dialogOptions.ariaLabel = ariaLabel
	if (actions && actionsElement) dialogOptions.actions = actionsElement
	if (labels !== undefined) dialogOptions.labels = labels
	if (fields !== undefined) dialogOptions.fields = fields
	if (verify !== undefined) dialogOptions.verify = verify
	if (className !== undefined) dialogOptions.className = className
	const resolvedParentElement = parentElement ?? overlayHost?.element() ?? undefined
	if (resolvedParentElement !== undefined) dialogOptions.parentElement = resolvedParentElement
	const resolvedIsolationRoot = isolationRoot ?? overlayHost?.scope() ?? undefined
	if (resolvedIsolationRoot !== undefined) dialogOptions.isolationRoot = resolvedIsolationRoot
	if (onok !== undefined) dialogOptions.onOk = onok
	if (oncancel !== undefined) dialogOptions.onCancel = oncancel
	currentDialog = createGooDialog(dialogOptions)
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
