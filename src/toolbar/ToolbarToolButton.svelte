<script lang="ts">
	import { mountFunctionIcon } from './mountFunctionIcon.ts'
	import type { ToolbarToolButtonConfig } from './toolbarChromeModel.ts'

	let {
		icon,
		id,
		title
	}: ToolbarToolButtonConfig = $props()

	let rootElement = $state<HTMLElement | undefined>()

	export function getRootElement(): HTMLElement | undefined {
		return rootElement
	}
</script>

<sketch-Tool
	bind:this={rootElement}
	data-tool={id}
	use:mountFunctionIcon={{ icon, position: 'prepend' }}
>
	{#if typeof icon === 'string'}
		<sketch-tool-icon class={icon}></sketch-tool-icon>
	{/if}

	{#if title}
		<sketch-ToolTitle data-translate>{title}</sketch-ToolTitle>
	{/if}
</sketch-Tool>
