<script lang="ts">
	interface Props {
		message?: string
		value?: number
		onchange?: (value: number) => void
		oninput?: (value: number) => void
	}

	let {
		message,
		value = 0,
		onchange,
		oninput
	}: Props = $props()
</script>

<button
	type="button"
	class="self-contained-input-control"
	data-message={message}
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
