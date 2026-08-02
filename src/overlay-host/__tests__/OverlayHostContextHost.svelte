<script lang="ts">
	import { untrack } from 'svelte'
	import {
		type GooOverlayHost,
		provideGooOverlayHost,
		useGooOverlayHost
	} from '../index.ts'

	let { host }: { host: GooOverlayHost } = $props()
	const providedHost = provideGooOverlayHost(untrack(() => host))
	const consumedHost = useGooOverlayHost()

	export function readProvidedHost(): GooOverlayHost {
		return providedHost
	}

	export function readConsumedHost(): GooOverlayHost | null {
		return consumedHost
	}
</script>
