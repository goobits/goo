<script lang="ts">
import { tick, type Snippet } from 'svelte'
import {
	getFocusTrapItems,
	handleFocusTrapKeyboardEvent
} from './_focusTrapKeyboard.ts'

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
	void tick().then(() => {
		const first = focusables()[0] ?? root
		first.focus()
	})
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
	onkeydown={handleKeydown}
>
	{@render children()}
</div>
