<script lang="ts">
	import GooSelect from '../GooSelect.svelte'
	import type { GooSelectElement, GooSelectOptionsInput } from '../types.ts'

	let { options = [] }: { options?: GooSelectOptionsInput } = $props()
	let select: GooSelectElement | null = $state(null)

	$effect(() => {
		select?.setOptions(options)
	})
</script>

<GooSelect bind:element={select} value="a" />
