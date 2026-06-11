<script lang="ts">
	interface Props {
		value?: number
		onchange?: (value: number) => void
		oninput?: (value: number) => void
	}

	let {
		value = 0,
		onchange,
		oninput
	}: Props = $props()
</script>

<button
	type="button"
	class="self-contained-input-control"
	onclick={() => oninput?.(value + 1)}
>
	Input
</button>

<button
	type="button"
	class="self-contained-change-control"
	onclick={() => onchange?.(value + 2)}
>
	Change
</button>
