<script lang="ts">
	import { reactiveControlTracker } from './_reactiveControlTracker.js'

	interface Props {
		value?: number
		onchange?: (value: number) => void
	}

	let {
		value = 0,
		onchange
	}: Props = $props()

	$effect(() => {
		reactiveControlTracker.mountCount += 1
	})
</script>

<button
	type="button"
	class="reactive-control"
	onclick={() => onchange?.(value + 1)}
>
	{value}
</button>
