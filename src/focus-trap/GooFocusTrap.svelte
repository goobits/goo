<script lang="ts">
import type { Snippet } from 'svelte'
import {
	activateModalIsolation,
	getFocusTrapItems,
	handleFocusTrapKeyboardEvent
} from '../support/keyboard/_focus.ts'

let {
	ariaLabel,
	ariaLabelledby,
	children,
	class: className = '',
	onClick,
	onEscape,
	role = 'dialog'
}: {
	ariaLabel?: string
	ariaLabelledby?: string
	children: Snippet
	class?: string
	onClick?: (event: MouseEvent) => void
	onEscape?: () => void
	role?: 'dialog'
} = $props()

let root: HTMLElement | undefined = $state()

function focusables(): HTMLElement[] {
	return getFocusTrapItems(root)
}

$effect(() => {
	if (!root) return
	let disposed = false
	const previousActiveElement = root.ownerDocument.activeElement
	const isolation = activateModalIsolation({ modal: root })
	const first = focusables()[0] ?? root
	first.focus({ preventScroll: true })

	return () => {
		disposed = true
		isolation.detach()
		if (previousActiveElement instanceof HTMLElement && previousActiveElement.isConnected) {
			previousActiveElement.focus({ preventScroll: true })
		}
	}
})

function handleKeydown(event: KeyboardEvent): void {
	handleFocusTrapKeyboardEvent(event, { onEscape, root })
}
</script>

<div
	bind:this={root}
	class={className}
	{role}
	aria-modal="true"
	aria-label={ariaLabel}
	aria-labelledby={ariaLabelledby}
	tabindex="-1"
	onclick={onClick}
	onkeydowncapture={handleKeydown}
>
	{@render children()}
</div>
