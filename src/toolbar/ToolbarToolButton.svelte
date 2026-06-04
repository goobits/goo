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

<button
	bind:this={rootElement}
	class="goo-toolbar-tool-button"
	data-tool={id}
	type="button"
	use:mountFunctionIcon={{ icon, position: 'prepend' }}
>
	{#if typeof icon === 'string'}
		<span class="goo-toolbar-tool-button__icon {icon}" aria-hidden="true"></span>
	{/if}

	{#if title}
		<span class="goo-toolbar-tool-button__title">{title}</span>
	{/if}
</button>
