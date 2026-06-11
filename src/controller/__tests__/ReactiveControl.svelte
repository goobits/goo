<script lang="ts">
	import { reactiveControlTracker } from './_reactiveControlTracker.ts'

	interface Props {
		value?: unknown
		onchange?: (value: unknown) => void
	}

	let {
		value = 0,
		onchange
	}: Props = $props()

	const label = $derived(typeof value === 'object' ? JSON.stringify(value) : String(value))

	$effect(() => {
		reactiveControlTracker.mountCount += 1
	})
</script>

<button
	type="button"
	class="reactive-control"
	onclick={() => onchange?.(typeof value === 'number' ? value + 1 : value)}
>
	{label}
</button>
