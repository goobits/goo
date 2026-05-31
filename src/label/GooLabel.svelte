<script lang="ts">
import './GooLabel.css'
import type { GooLabelProps } from './types.js'

let {
	for: forId = '',
	required = false,
	disabled = false,
	class: className = '',
	style,
	children
}: GooLabelProps = $props()
</script>

<label
	class={['goo-label', className].filter(Boolean).join(' ')}
	for={forId || undefined}
	aria-disabled={disabled ? 'true' : undefined}
	data-required={required ? 'true' : undefined}
	data-disabled={disabled ? 'true' : undefined}
	{style}
>
	<span class="goo-label__content">
		{@render children?.()}
	</span>
	{#if required}
		<span class="goo-label__required" aria-hidden="true">*</span>
	{/if}
</label>
