<script lang="ts">
	import GooTurnstileField from '../GooTurnstileField.svelte'

	let resetSignal = $state(0)

	export function issueReset(): void {
		resetSignal += 1
	}
</script>

<GooTurnstileField siteKey="fake-site-key" {resetSignal} />
