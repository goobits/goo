<script module lang="ts">
import type { SvelteControlSchema } from '../controller/svelteControl.svelte.ts'

/** GooController binding metadata for the Svelte text input component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		multiline: 'multiline',
		name: 'name',
		placeholder: 'placeholder',
		readonly: 'readonly',
		required: 'required',
		size: 'size',
		type: 'type'
	}
}
</script>

<script lang="ts" generics="T = string">
import { onDestroy } from 'svelte'
import '../field/goo-field.css'
import './GooInput.css'

import type { GooInputProps } from './types.ts'

let inputElement: HTMLDivElement | undefined = $state()
let contentElement: HTMLInputElement | HTMLTextAreaElement | undefined = $state()
let currentValue = $state<T>('' as T)
let lastCommittedValue = $state<T>('' as T)
let changePulseTimeout: ReturnType<typeof setTimeout> | null = null
let skipNextValueSync = false

let {
	value = $bindable<T>('' as T),
	placeholder = '',
	type = 'text',
	multiline = false,
	name = '',
	inputId,
	ariaLabel,
	autocomplete,
	spellcheck,
	autocapitalize,
	disabled = false,
	readonly = false,
	required = false,
	size,
	class: className = '',
	style,
	tabIndex = 0,
	children,
	oninput,
	onchange,
	onfocus,
	onblur,
	onkeydown,
	...rest
}: GooInputProps<T> = $props()

$effect(() => {
	if (skipNextValueSync && Object.is(value, currentValue)) {
		skipNextValueSync = false
		return
	}
	currentValue = value
	lastCommittedValue = value
})

onDestroy(() => {
	if (changePulseTimeout) clearTimeout(changePulseTimeout)
})

const classes = $derived.by(() => {
	const values = [ 'goo-input' ]
	if (multiline) values.push('goo-input--multiline')
	if (disabled) values.push('goo-input--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

// Custom host attributes (CSS / external-query hooks) spread so svelte-check
// does not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | undefined>>({
	size,
	disabled: disabled ? '' : undefined,
	multiline: multiline ? '' : undefined
})

export function setValue(nextValue: T, { silent = true }: { silent?: boolean } = {}): void {
	const oldValue = currentValue
	currentValue = nextValue
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		pulseValueChange()
	}
	if (!silent && oldValue !== currentValue) {
		emitChange(oldValue)
	}
}

export function getValue(): T {
	return currentValue
}

export function focus(): void {
	contentElement?.focus()
}

export function blur(): void {
	contentElement?.blur()
}

export function select(): void {
	contentElement?.select()
}

function handleInput(event: Event): void {
	event.stopPropagation()
	if (disabled) return

	const oldValue = currentValue
	currentValue = contentElement?.value as T
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		pulseValueChange()
		const detail = { value: currentValue, oldValue, target: inputElement }
		oninput?.(currentValue, oldValue)
		inputElement?.dispatchEvent(new CustomEvent('input', { bubbles: true, detail }))
	}
}

function handleFocus(event: Event): void {
	event.stopPropagation()
	if (disabled) return

	lastCommittedValue = currentValue
	inputElement?.classList.add('goo-input--focused')
	onfocus?.()
	inputElement?.dispatchEvent(new CustomEvent('focus', { detail: { value: currentValue, target: inputElement } }))
}

function handleBlur(event: Event): void {
	event.stopPropagation()
	inputElement?.classList.remove('goo-input--focused')
	if (disabled) return

	const oldValue = lastCommittedValue
	currentValue = contentElement?.value as T
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		lastCommittedValue = currentValue
		emitChange(oldValue)
	}
	onblur?.()
	inputElement?.dispatchEvent(new CustomEvent('blur', { detail: { value: currentValue, target: inputElement } }))
}

function handleKeydown(event: KeyboardEvent): void {
	event.stopPropagation()
	if (disabled) return
	onkeydown?.(event)
	if (event.defaultPrevented) return

	if (!multiline && (event.key === 'Escape' || event.key === 'Enter')) {
		event.preventDefault()
		contentElement?.blur()
	}
	if (multiline && event.key === 'Escape') {
		event.preventDefault()
		contentElement?.blur()
	}
}

function emitChange(oldValue: T): void {
	const detail = { value: currentValue, oldValue, target: inputElement }
	onchange?.(currentValue, oldValue)
	inputElement?.dispatchEvent(new CustomEvent('change', { bubbles: true, detail }))
}

function syncBoundValue(nextValue: T): void {
	skipNextValueSync = true
	value = nextValue
}

function pulseValueChange(): void {
	const element = inputElement
	if (!element) return

	element.classList.remove('goo-input--changed')
	void element.offsetWidth
	element.classList.add('goo-input--changed')
	if (changePulseTimeout) clearTimeout(changePulseTimeout)
	changePulseTimeout = setTimeout(() => {
		element.classList.remove('goo-input--changed')
		changePulseTimeout = null
	}, 340)
}
</script>

<div
	{...rest}
	bind:this={inputElement}
	class={classes}
	{style}
	{...hostAttributes}
	onpointerdown={(event) => event.stopPropagation()}
>
	{#if multiline}
		<textarea
			bind:this={contentElement}
			class="goo-input__content"
			id={inputId}
			{name}
			{placeholder}
			aria-label={ariaLabel}
			autocomplete={autocomplete}
			spellcheck={spellcheck}
			autocapitalize={autocapitalize}
			{disabled}
			readOnly={readonly}
			{required}
			tabindex={tabIndex}
			value={String(currentValue ?? '')}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			onkeyup={(event) => event.stopPropagation()}
		></textarea>
	{:else}
		<input
			bind:this={contentElement}
			class="goo-input__content"
			id={inputId}
			{type}
			{name}
			{placeholder}
			aria-label={ariaLabel}
			autocomplete={autocomplete}
			spellcheck={spellcheck}
			autocapitalize={autocapitalize}
			{disabled}
			readOnly={readonly}
			{required}
			tabindex={tabIndex}
			value={String(currentValue ?? '')}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			onkeyup={(event) => event.stopPropagation()}
		/>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
