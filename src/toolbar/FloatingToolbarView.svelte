<script lang="ts">
	import { mountFunctionIcon } from './mountFunctionIcon.ts'
	import {
		readFloatingToolbarGroups,
		type FloatingToolbarGroups,
		type FloatingToolbarToolConfig
	} from './toolbarChromeModel.ts'

	interface Props {
		toolGroups?: FloatingToolbarGroups
	}

	let {
		toolGroups = {}
	}: Props = $props()

	let rootElement = $state<HTMLElement | undefined>()

	const groups = $derived(readFloatingToolbarGroups(toolGroups))

	export function getRootElement(): HTMLElement | undefined {
		return rootElement
	}

	function toolClass(tool: FloatingToolbarToolConfig): string {
		return [
			'goo-floating-toolbar__tool',
			typeof tool.icon === 'string' ? tool.icon : '',
			tool.disabled ? 'disabled' : ''
		].filter(Boolean).join(' ')
	}
</script>

<sketch-FloatingToolbar
	bind:this={rootElement}
	class="goo-floating-toolbar"
	role="toolbar"
	aria-label="Floating tool options"
	tabindex="0"
>
	{#each groups as tools, groupIndex}
		{#each tools as tool}
			<sketch-Tool
				id={tool.id}
				class={toolClass(tool)}
				data-exec={tool.exec}
				data-tooltip={tool.tooltip}
				use:mountFunctionIcon={tool.icon}
			></sketch-Tool>
		{/each}

		{#if groupIndex < groups.length - 1}
			<hr>
		{/if}
	{/each}
</sketch-FloatingToolbar>
