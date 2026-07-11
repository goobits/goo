<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte textarea component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		cols: 'cols',
		maxLength: 'maxLength',
		minLength: 'minLength',
		name: 'name',
		placeholder: 'placeholder',
		readonly: 'readonly',
		required: 'required',
		rows: 'rows',
		title: 'title'
	}
}
</script>

<script lang="ts">
import { untrack } from 'svelte'
import './GooTextarea.css'

import type { GooTextareaProps } from './types.ts'

let textareaElement: HTMLDivElement | undefined = $state()
let inputElement: HTMLTextAreaElement | undefined = $state()
let currentValue = $state('')
let lastCommittedValue = $state('')
let skipNextValueSync = false

let {
	value = $bindable(''),
	placeholder = '',
	name = '',
	inputId,
	rows = 3,
	cols,
	minLength,
	maxLength,
	disabled = false,
	readonly = false,
	required = false,
	class: className = '',
	style,
	tabIndex,
	children,
	oninput,
	onchange,
	...rest
}: GooTextareaProps = $props()

$effect(() => {
	if (skipNextValueSync && Object.is(String(value ?? ''), currentValue)) {
		skipNextValueSync = false
		return
	}
	currentValue = String(value ?? '')
	lastCommittedValue = currentValue
})

const classes = $derived.by(() => {
	const values = [ 'goo-textarea' ]
	if (disabled) values.push('goo-textarea--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

// `disabled` is a CSS styling hook on the host <div>; spread so svelte-check
// does not reject it as an unknown attribute.
const hostAttributes = $derived<Record<string, string | undefined>>({
	disabled: disabled ? '' : undefined
})

let apiElement: HTMLDivElement | undefined

// Mirror the element API GooCheckbox/GooRadioGroup attach to their roots so
// element-driven consumers get one calling convention across controls:
// `.value =` is silent, `setValue()` emits change.
$effect(() => {
	const element = textareaElement
	if (!element || apiElement === element) return
	apiElement = element
	untrack(() => Object.defineProperties(element, {
		value: {
			configurable: true,
			get: () => currentValue,
			set: value => setValue(String(value), { silent: true })
		},
		setValue: {
			configurable: true,
			value: (value: string, options: { silent?: boolean } = {}) => setValue(value, { silent: options.silent ?? false })
		},
		getValue: {
			configurable: true,
			value: () => getValue()
		},
		focus: {
			configurable: true,
			value: () => focus()
		},
		blur: {
			configurable: true,
			value: () => blur()
		},
		select: {
			configurable: true,
			value: () => select()
		}
	}))
})

export function setValue(nextValue: string, { silent = true }: { silent?: boolean } = {}): void {
	const oldValue = currentValue
	currentValue = String(nextValue)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		if (!silent) {
			emitChange(oldValue)
		}
	}
}

export function getValue(): string {
	return currentValue
}

export function focus(): void {
	inputElement?.focus()
}

export function blur(): void {
	inputElement?.blur()
}

export function select(): void {
	inputElement?.select()
}

function handleInput(event: Event): void {
	event.stopPropagation()
	const oldValue = currentValue
	currentValue = inputElement?.value ?? ''
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		const detail = { value: currentValue, oldValue, target: textareaElement }
		oninput?.(currentValue, oldValue)
		textareaElement?.dispatchEvent(new CustomEvent('input', { bubbles: true, detail }))
	}
}

function handleChange(event: Event): void {
	event.stopPropagation()
	const oldValue = lastCommittedValue
	currentValue = inputElement?.value ?? ''
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		lastCommittedValue = currentValue
		emitChange(oldValue)
	}
}

function emitChange(oldValue: string): void {
	const detail = { value: currentValue, oldValue, target: textareaElement }
	onchange?.(currentValue, oldValue)
	textareaElement?.dispatchEvent(new CustomEvent('change', { bubbles: true, detail }))
}

function syncBoundValue(nextValue: string): void {
	skipNextValueSync = true
	value = nextValue
}
</script>

<div
	{...rest}
	bind:this={textareaElement}
	class={classes}
	{style}
	{...hostAttributes}
>
	<textarea
		bind:this={inputElement}
		class="goo-textarea__input"
		id={inputId}
		{name}
		{placeholder}
		{rows}
		{cols}
		minlength={minLength}
		maxlength={maxLength}
		{disabled}
		readonly={readonly}
		{required}
		tabindex={tabIndex}
		value={currentValue}
		oninput={handleInput}
		onchange={handleChange}
	></textarea>
	{#if children}
		{@render children()}
	{/if}
</div>
