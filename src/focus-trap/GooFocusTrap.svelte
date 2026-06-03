<script lang="ts">
import { tick, type Snippet } from 'svelte'

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

const focusableSelector = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',')

function focusables(): HTMLElement[] {
	if (!root) return []
	return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector))
}

$effect(() => {
	if (!root) return
	void tick().then(() => {
		const first = focusables()[0] ?? root
		first.focus()
	})
})

function handleKeydown(event: KeyboardEvent): void {
	if (event.key === 'Escape') {
		event.preventDefault()
		onEscape?.()
		return
	}
	if (event.key !== 'Tab') return
	const items = focusables()
	if (items.length === 0) {
		event.preventDefault()
		return
	}
	const first = items[0]
	const last = items[items.length - 1]
	const active = document.activeElement
	if (event.shiftKey && active === first) {
		event.preventDefault()
		last.focus()
	} else if (!event.shiftKey && active === last) {
		event.preventDefault()
		first.focus()
	}
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
