<script lang="ts">
	import {
		activateModalIsolation,
		getFocusTrapItems,
		handleFocusTrapKeyboardEvent
	} from '@goobits/keyboard'
	import type { GooFocusTrapProps } from './types.ts'

	let {
		ariaLabel,
		ariaLabelledby,
		'aria-label': nativeAriaLabel,
		'aria-labelledby': nativeAriaLabelledby,
		children,
		class: className = '',
		onclick,
		onEscape,
		role = 'dialog',
		...rest
	}: GooFocusTrapProps = $props()

	let root: HTMLElement | undefined = $state()
	const resolvedAriaLabel = $derived(
		ariaLabel ?? (typeof nativeAriaLabel === 'string' ? nativeAriaLabel : undefined)
	)
	const resolvedAriaLabelledby = $derived(
		ariaLabelledby ?? (typeof nativeAriaLabelledby === 'string' ? nativeAriaLabelledby : undefined)
	)

	function focusables(): HTMLElement[] {
		return getFocusTrapItems(root)
	}

	$effect(() => {
		if (!root) return
		const previousActiveElement = root.ownerDocument.activeElement
		const isolation = activateModalIsolation({ modal: root })
		const first = focusables()[0] ?? root
		first.focus({ preventScroll: true })

		return () => {
			isolation.detach()
			if (previousActiveElement instanceof HTMLElement && previousActiveElement.isConnected) {
				previousActiveElement.focus({ preventScroll: true })
			}
		}
	})

	function handleKeydown(event: KeyboardEvent): void {
		handleFocusTrapKeyboardEvent(event, {
			...(onEscape ? { onEscape } : {}),
			...(root ? { root } : {})
		})
	}
</script>

<div
	{...rest}
	bind:this={root}
	class={className}
	{role}
	aria-modal="true"
	aria-label={resolvedAriaLabel}
	aria-labelledby={resolvedAriaLabelledby}
	tabindex="-1"
	{onclick}
	onkeydowncapture={handleKeydown}
>
	{@render children()}
</div>
