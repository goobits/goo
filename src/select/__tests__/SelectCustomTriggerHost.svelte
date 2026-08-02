<script lang="ts">
	import GooSelect from '../GooSelect.svelte'
</script>

<GooSelect ariaLabel="More actions" options={[{ id: 'edit', label: 'Edit' }]}>
	{#snippet trigger()}
		<span data-testid="custom-trigger">⋮</span>
	{/snippet}
</GooSelect>
