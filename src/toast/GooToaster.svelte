<script lang="ts">
import './GooToaster.css'
import type { GooToasterProps } from './types.ts'
import { toastStore } from './toast-service.svelte.ts'
import GooToast from './GooToast.svelte'

let {
	position = 'top-right',
	max = 5,
	class: className = ''
}: GooToasterProps = $props()

const visibleToasts = $derived(
	toastStore.toasts.slice(-max)
)

function handleDismiss(id: string): void {
	toastStore.remove(id)
}

$effect(() => {
	if (toastStore.toasts.length > max) {
		toastStore.evictOldest()
	}
})
</script>

<div
	class="goo-toaster goo-toaster--{ position } { className }"
	aria-live="polite"
	aria-atomic="false"
>
	{#each visibleToasts as toast (toast.id)}
		<GooToast {toast} ondismiss={handleDismiss} />
	{/each}
</div>
