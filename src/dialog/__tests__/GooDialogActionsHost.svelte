<script lang="ts">
import GooDialog from '../GooDialog.svelte'

let open = $state(false)
let saving = $state(false)

function save(): void {
	saving = true
}
</script>

<button data-testid="opener" type="button" onclick={() => { open = true }}>Open</button>
<output data-testid="open-state">{String(open)}</output>

<GooDialog bind:open heading="Custom actions" showClose={false}>
	<p>Dialog body</p>

	{#snippet actions()}
		<button type="button" onclick={() => { open = false }}>Cancel</button>
		<button type="button" disabled={saving} onclick={save}>
			{saving ? 'Saving…' : 'Save'}
		</button>
	{/snippet}
</GooDialog>
