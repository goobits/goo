<script lang="ts">
import VirtualGrid from '../VirtualGrid.svelte'
import type { VirtualGridProps } from '../types.ts'

type HarnessProps = Omit<VirtualGridProps<number>, 'children' | 'items'> & { items?: number[] }

let { items = [ 0, 1, 2 ], ...rest }: HarnessProps = $props()
</script>

<VirtualGrid {items} {...rest}>
	{#snippet children({ slot })}
		<div class="harness-tile" data-slot={slot}>{slot}</div>
	{/snippet}
</VirtualGrid>
