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

<div
	bind:this={rootElement}
	class="goo-floating-toolbar"
	role="toolbar"
	aria-label="Floating tool options"
	aria-orientation="vertical"
	tabindex="0"
>
	{#each groups as tools, groupIndex}
		{#each tools as tool}
			<button
				id={tool.id}
				aria-label={tool.tooltip}
				class={toolClass(tool)}
				data-affordance-id={tool.affordanceId}
				data-affordance-kind={tool.affordanceKind}
				data-affordance-modifier={tool.affordanceModifier}
				data-affordance-owner-ids={tool.affordanceOwnerIds?.join(' ')}
				data-affordance-quick-tool-id={tool.affordanceQuickToolId}
				data-exec={tool.exec}
				data-tooltip={tool.tooltip}
				aria-disabled={tool.disabled ? 'true' : undefined}
				aria-pressed={tool.affordanceKind ? 'false' : undefined}
				disabled={tool.disabled}
				type="button"
				use:mountFunctionIcon={tool.icon}
			></button>
		{/each}

		{#if groupIndex < groups.length - 1}
			<hr>
		{/if}
	{/each}
</div>
