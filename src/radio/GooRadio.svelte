<script lang="ts">
import { untrack } from 'svelte'
import './GooRadio.css'
import { handleKeyboardActivation } from '../support/keyboard/_keyboardActivation.ts'
import type { GooRadioProps } from './types.ts'

let radioElement: HTMLButtonElement | undefined = $state()

let {
	value = '',
	label = '',
	checked = $bindable(false),
	disabled = false,
	name = '',
	class: className = '',
	style,
	tabIndex = 0,
	children,
	onchange,
	...rest
}: GooRadioProps = $props()

let currentChecked = $state(false)

$effect(() => {
	currentChecked = Boolean(checked)
})

const classes = $derived.by(() => {
	const values = ['goo-radio']
	if (currentChecked) values.push('goo-radio--checked')
	if (disabled) values.push('goo-radio--disabled')
	if (className) values.push(className)
	return values.join(' ')
})

let apiElement: HTMLButtonElement | undefined

$effect(() => {
	const element = radioElement
	if (!element || apiElement === element) return
	apiElement = element
	untrack(() => Object.defineProperties(element, {
		checked: {
			configurable: true,
			get: () => currentChecked,
			set: value => setChecked(Boolean(value), { silent: true })
		},
		setChecked: {
			configurable: true,
			value: (value: boolean, options: { silent?: boolean } = {}) => setChecked(value, options)
		},
		check: {
			configurable: true,
			value: (options: { silent?: boolean } = {}) => check(options)
		},
		uncheck: {
			configurable: true,
			value: (options: { silent?: boolean } = {}) => setChecked(false, options)
		}
	}))
})

function emitChange(oldValue: string | null): void {
	if (!radioElement) return
	const emittedValue = currentChecked ? value : null
	onchange?.(emittedValue, oldValue)
	radioElement.dispatchEvent(new CustomEvent('change', {
		bubbles: true,
		detail: { value: emittedValue, checked: currentChecked, oldValue, target: radioElement }
	}))
}

function setChecked(nextChecked: boolean, { silent = false }: { silent?: boolean } = {}): void {
	const oldChecked = currentChecked
	currentChecked = Boolean(nextChecked)
	if (oldChecked !== currentChecked) {
		checked = currentChecked
	}
	if (!silent && oldChecked !== currentChecked) {
		emitChange(oldChecked ? value : null)
	}
}

function check(options: { silent?: boolean } = {}): void {
	if (disabled || currentChecked) return
	if (name && !radioElement?.closest('.goo-radio-group')) {
		for (const sibling of document.querySelectorAll<HTMLButtonElement>(`.goo-radio[name="${cssEscape(name)}"]`)) {
			if (sibling !== radioElement && 'uncheck' in sibling) {
				(sibling as HTMLButtonElement & { uncheck(options?: { silent?: boolean }): void }).uncheck({ silent: true })
			}
		}
	}
	setChecked(true, options)
}

function handleClick(event: MouseEvent): void {
	if (disabled) {
		event.preventDefault()
		event.stopImmediatePropagation()
		return
	}
	check()
}

function handleKeydown(event: KeyboardEvent): void {
	if (disabled) return
	handleKeyboardActivation(event, () => check())
}

function cssEscape(value: string): string {
	return globalThis.CSS?.escape?.(value) ?? value.replaceAll('"', '\\"')
}
</script>

<button
	{...rest}
	bind:this={radioElement}
	type="button"
	class={classes}
	{style}
	{name}
	{value}
	data-value={value}
	role="radio"
	aria-label={!label && !children ? value : undefined}
	aria-checked={currentChecked}
	aria-disabled={disabled ? 'true' : undefined}
	{disabled}
	tabindex={disabled ? undefined : tabIndex}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<span class="goo-radio__circle" aria-hidden="true">
		<span class="goo-radio__dot"></span>
	</span>
	{#if children}
		<span class="goo-radio__label">
			{@render children()}
		</span>
	{:else if label}
		<span class="goo-radio__label">{label}</span>
	{/if}
</button>
