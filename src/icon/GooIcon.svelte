<script lang="ts">
import './GooIcon.css'
import { iconRegistry } from './registry.ts'
import type { GooIconProps } from './types.ts'

let {
	value = '',
	size = 16,
	disabled = false,
	class: className = '',
	style = '',
	label
}: GooIconProps = $props()

const sizeValue = $derived(typeof size === 'number' ? `${size}px` : `${Number.parseFloat(size) || 16}px`)
const svg = $derived(value ? iconRegistry.get(value, { size: Number.parseFloat(sizeValue) }) : null)
const hasStrokeOnlyIcon = $derived(Boolean(svg?.includes('fill="none"') || svg?.includes("fill='none'")))
const inlineStyle = $derived(`width:${sizeValue};height:${sizeValue};${style}`)
</script>

<span
	class={['goo-icon', className].filter(Boolean).join(' ')}
	style={inlineStyle}
	data-value={value}
	data-stroke={hasStrokeOnlyIcon ? '' : undefined}
	data-disabled={disabled ? 'true' : undefined}
	aria-hidden={label ? undefined : 'true'}
	aria-label={label}
	role={label ? 'img' : undefined}
>
	{#if svg}
		{@html svg}
	{/if}
</span>
