<script lang="ts">
import './GooButton.css'
import type { GooButtonProps } from './types.ts'

let buttonElement: HTMLAnchorElement | HTMLButtonElement | undefined = $state()

let {
	value = '',
	formValue,
	type = 'button',
	disabled = false,
	href,
	target,
	rel,
	block = false,
	fullRow = false,
	title,
	tooltip,
	ariaLabel,
	ariaPressed,
	variant = 'default',
	size,
	square = false,
	toggle = false,
	pressed = $bindable(false),
	layout = 'inline',
	class: className = '',
	style,
	icon,
	children,
	onclick,
	onactivate,
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
	if (block || fullRow) values.push('goo-button--full-row', 'goo-button--block')
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
	onactivate?.(event)
	buttonElement?.dispatchEvent(new CustomEvent('activate', {
		bubbles: true,
		cancelable: true,
		composed: true,
		detail: { sourceEvent: event }
	}))
}

const resolvedTitle = $derived(title || tooltip || undefined)
const resolvedAriaLabel = $derived(ariaLabel || (!children && !value ? resolvedTitle : undefined))
</script>

{#if href}
	<a
		{...rest}
		bind:this={buttonElement}
		class={classes}
		href={disabled ? undefined : href}
		{target}
		{rel}
		title={resolvedTitle}
		aria-label={resolvedAriaLabel}
		{...hostAttributes}
		aria-disabled={disabled ? 'true' : undefined}
		tabindex={disabled ? -1 : rest.tabindex ?? rest.tabIndex}
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
		{:else if value}
			<span class="goo-button__title" data-translate>{value}</span>
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
		{:else if value}
			<span class="goo-button__title" data-translate>{value}</span>
		{/if}
	</button>
{/if}
