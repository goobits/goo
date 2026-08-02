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
import { createGooTooltip } from '../tooltip/tooltip.ts'
import type { GooButtonElement, GooButtonProps } from './types.ts'

let buttonElement: GooButtonElement | undefined = $state()

let {
	label = '',
	formValue,
	form,
	type = 'button',
	disabled = false,
	href,
	target,
	rel,
	fullRow = false,
	title,
	tooltip,
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
	element = $bindable<GooButtonElement | null>(null),
	onclick,
	onmouseenter,
	onmouseleave,
	onactivate,
	onchange,
	...rest
}: GooButtonProps = $props()

let currentPressed = $state(false)

$effect(() => {
	currentPressed = Boolean(pressed)
})

$effect(() => {
	element = buttonElement ?? null
})

$effect(() => {
	const target = buttonElement
	if (!target || !tooltip) return

	const instance = createGooTooltip({
		for: target,
		content: tooltip,
		arrow: true
	})

	return () => instance.destroy()
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
	onactivate?.(event)
}

const resolvedTitle = $derived(title || undefined)
const resolvedAriaLabel = $derived(
	ariaLabel
		|| (typeof nativeAriaLabel === 'string' ? nativeAriaLabel : undefined)
		|| (!children && !label ? resolvedTitle || tooltip : undefined)
)
const rendersAnchor = $derived(typeof href === 'string')
</script>

<svelte:element
	this={rendersAnchor ? 'a' : 'button'}
	{...rest}
	bind:this={buttonElement}
	class={classes}
	href={rendersAnchor && !disabled ? href : undefined}
	target={rendersAnchor ? target : undefined}
	rel={rendersAnchor ? rel : undefined}
	type={rendersAnchor ? undefined : type}
	form={rendersAnchor ? undefined : form}
	value={rendersAnchor ? undefined : formValue}
	disabled={rendersAnchor ? undefined : disabled}
	{title}
	aria-label={resolvedAriaLabel}
	{...hostAttributes}
	aria-disabled={disabled ? 'true' : undefined}
	aria-pressed={!rendersAnchor && toggle ? currentPressed : !rendersAnchor ? ariaPressed : undefined}
	tabindex={disabled ? -1 : tabIndex}
	{style}
	onclick={handleClick}
	{onmouseenter}
	{onmouseleave}
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
</svelte:element>
