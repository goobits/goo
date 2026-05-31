<script lang="ts">
import './GooSpinner.css'
import { resolveSpinnerAttrs } from './_spinnerAttrs.js'
import type { GooSpinnerProps } from './types.js'

let {
	size,
	thickness,
	variant,
	label = 'Loading',
	ariaHidden = false,
	class: className = ''
}: GooSpinnerProps = $props()

const resolved = $derived(resolveSpinnerAttrs({ size, thickness, variant }))

// Custom presentation attributes (`size`, `variant`) drive CSS selectors; spread
// so svelte-check does not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | undefined>>({
	size: resolved.sizeAttr,
	variant: resolved.variantAttr
})
</script>

<div
	class={[ 'goo-spinner', className ].filter(Boolean).join(' ')}
	role={ariaHidden ? undefined : 'status'}
	aria-label={ariaHidden ? undefined : label}
	aria-hidden={ariaHidden ? 'true' : undefined}
	{...hostAttributes}
	style={resolved.style}
></div>
