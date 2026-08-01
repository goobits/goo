<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte button component. */
export const controlSchema: SvelteControlSchema = {
	valueKey: 'label',
	transformValue: (_value, options) => options['label'],
	propMapping: {
		className: 'class',
		fullRow: 'fullRow',
		onclick: 'onclick'
	}
}
</script>

<script lang="ts">
import './GooButton.css'
import type { GooButtonProps } from './types.ts'

let buttonElement: HTMLAnchorElement | HTMLButtonElement | undefined = $state()

let {
	label = '',
	formValue,
	type = 'button',
	disabled = false,
	target,
	rel,
	fullRow = false,
	title,
	ariaLabel,
	'aria-label': nativeAriaLabel,
	ariaPressed,
	variant = 'default',
	size,
	square = false,
	toggle = false,
	pressed = $bindable(false),
	layout = 'inline',
	tabIndex,
	class: className = '',
	style,
	icon,
	children,
	onclick,
	onchange,
	...rest
}: GooButtonProps = $props()

let currentPressed = $state(false)

$effect(() => {
	currentPressed = Boolean(pressed)
})

const classes = $derived.by(() => {
	const values = ['goo-button']
	if (disabled) values.push('goo-button--disabled')
	if (toggle && currentPressed) values.push('goo-button--selected')
	if (fullRow) values.push('goo-button--full-row')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

// Custom host attributes (CSS / external-query hooks) spread so svelte-check
// does not reject them as unknown attributes on a <button>.
const hostAttributes = $derived<Record<string, string | undefined>>({
	variant: variant === 'default' ? undefined : variant,
	size,
	square: square ? '' : undefined,
	layout
})

function handleClick(event: MouseEvent): void {
	if (disabled) {
		event.preventDefault()
		event.stopImmediatePropagation()
		return
	}

	if (toggle) {
		const oldValue = currentPressed
		currentPressed = !currentPressed
		if (oldValue !== currentPressed) {
			pressed = currentPressed
			onchange?.(currentPressed, oldValue)
			buttonElement?.dispatchEvent(new CustomEvent('change', {
				bubbles: true,
				detail: { value: currentPressed, oldValue }
			}))
		}
	}

	onclick?.(event)
}

const resolvedTitle = $derived(title || undefined)
const resolvedAriaLabel = $derived(
	ariaLabel
		|| (typeof nativeAriaLabel === 'string' ? nativeAriaLabel : undefined)
		|| (!children && !label ? resolvedTitle : undefined)
)
</script>

{#if typeof rest.href === 'string'}
	<a
		{...rest}
		bind:this={buttonElement}
		class={classes}
		href={disabled ? undefined : rest.href}
		{target}
		{rel}
		title={resolvedTitle}
		aria-label={resolvedAriaLabel}
		{...hostAttributes}
		aria-disabled={disabled ? 'true' : undefined}
		tabindex={disabled ? -1 : tabIndex}
		{style}
		onclick={handleClick}
	>
		{#if icon}
			<span class="goo-button__icon" aria-hidden="true">
				{@render icon()}
			</span>
		{/if}
		{#if children}
			{@render children()}
		{:else if label}
			<span class="goo-button__title" data-translate>{label}</span>
		{/if}
	</a>
{:else}
	<button
		{...rest}
		bind:this={buttonElement}
		class={classes}
		{type}
		value={formValue}
		{disabled}
		title={resolvedTitle}
		aria-label={resolvedAriaLabel}
		{...hostAttributes}
		aria-disabled={disabled ? 'true' : undefined}
		aria-pressed={toggle ? currentPressed : ariaPressed}
		tabindex={disabled ? -1 : tabIndex}
		{style}
		onclick={handleClick}
	>
		{#if icon}
			<span class="goo-button__icon" aria-hidden="true">
				{@render icon()}
			</span>
		{/if}
		{#if children}
			{@render children()}
		{:else if label}
			<span class="goo-button__title" data-translate>{label}</span>
		{/if}
	</button>
{/if}
