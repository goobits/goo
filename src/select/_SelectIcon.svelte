<script lang="ts">
	import Check from '@lucide/svelte/icons/check'
	import ChevronRight from '@lucide/svelte/icons/chevron-right'

	let { name }: { name: 'check' | 'chevron-right' } = $props()
</script>

{#if name === 'check'}
	<Check aria-hidden="true" />
{:else}
	<ChevronRight aria-hidden="true" />
{/if}
