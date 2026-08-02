<script lang="ts">
import GooDialog from '../GooDialog.svelte'

let open = $state(false)
let saving = $state(false)
let heading = $state('Custom actions')

function save(): void {
	saving = true
}
</script>

<button data-testid="opener" type="button" onclick={() => { open = true }}>Open</button>
<output data-testid="open-state">{String(open)}</output>

<GooDialog bind:open {heading} showClose={false}>
	<p>Dialog body</p>
	<button data-testid="change-heading" type="button" onclick={() => { heading = 'Updated actions' }}>
		Change heading
	</button>

	{#snippet actions()}
		<button type="button" onclick={() => { open = false }}>Cancel</button>
		<button type="button" disabled={saving} onclick={save}>
			{saving ? 'Saving…' : 'Save'}
		</button>
	{/snippet}
</GooDialog>
