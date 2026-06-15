<script lang="ts">
import './GooTurnstileField.css'
import type { GooTurnstileFieldProps } from './types.ts'
import { ensureTurnstileScript } from './_scriptLoader.ts'

let {
	siteKey = '',
	action,
	cData,
	theme = 'auto',
	size,
	label = 'Security verification',
	class: className = '',
	style
}: GooTurnstileFieldProps = $props()

$effect(() => {
	if (!siteKey) return
	ensureTurnstileScript().catch(() => {
		// Script load failure is non-fatal — the Cloudflare-rendered widget
		// simply won't appear. Consumer can detect via missing form token.
	})
})
</script>

{#if siteKey}
	<div class="goo-turnstile-field {className}" {style} role="group" aria-label={label}>
		<div
			class="cf-turnstile"
			data-sitekey={siteKey}
			data-theme={theme}
			data-action={action ?? null}
			data-cdata={cData ?? null}
			data-size={size ?? null}
		></div>
	</div>
{/if}
