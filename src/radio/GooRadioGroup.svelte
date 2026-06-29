<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte radio-group component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		layout: 'layout',
		name: 'name',
		options: 'options',
		required: 'required'
	}
}
</script>

<script lang="ts">
import { untrack } from 'svelte'
import './GooRadioGroup.css'
import GooRadio from './GooRadio.svelte'
import { containKeyboardEvent } from '../support/keyboard/_keyboardActivation.ts'
import { normalizeRadioOptions } from './_model.ts'
import type { GooRadioGroupProps } from './types.ts'

type RadioElement = HTMLButtonElement & {
	checked: boolean
	check(options?: { silent?: boolean }): void
	setChecked(value: boolean, options?: { silent?: boolean }): void
	uncheck(options?: { silent?: boolean }): void
}

let groupElement: HTMLDivElement | undefined = $state()

let {
	value = $bindable<string | undefined>(undefined),
	options = [],
	name = '',
	disabled = false,
	required = false,
	class: className = '',
	style,
	layout = 'vertical',
	tabIndex = 0,
	children,
	onchange,
	...rest
}: GooRadioGroupProps = $props()

const normalizedOptions = $derived(normalizeRadioOptions(options))
let currentValue = $state('')

$effect(() => {
	const nextValue = value ?? normalizedOptions[0]?.value
	const previousValue = untrack(() => currentValue)
	if (nextValue !== undefined && !Object.is(previousValue, nextValue)) {
		currentValue = nextValue
	}
	void Promise.resolve().then(syncChildRadios)
})

const classes = $derived.by(() => {
	const values = ['goo-radio-group']
	if (disabled) values.push('goo-radio-group--disabled')
	if (className) values.push(className)
	return values.join(' ')
})

// `disabled` is a CSS styling hook on the host <div>; spread so svelte-check
// does not reject it as an unknown attribute.
const hostAttributes = $derived<Record<string, string | undefined>>({
	disabled: disabled ? '' : undefined
})

let apiElement: HTMLDivElement | undefined

$effect(() => {
	const element = groupElement
	if (!element || apiElement === element) return
	apiElement = element
	untrack(() => {
		Object.defineProperties(element, {
		value: {
			configurable: true,
			get: () => currentValue,
			set: value => setValue(String(value), { silent: true })
		},
		options: {
			configurable: true,
			get: () => normalizedOptions
		},
		setValue: {
			configurable: true,
			value: (value: string, options: { silent?: boolean } = {}) => setValue(value, options)
		},
		getValue: {
			configurable: true,
			value: () => currentValue
		}
	})
		syncChildRadios()
	})
})

function getRadios(): RadioElement[] {
	return Array.from(groupElement?.querySelectorAll('.goo-radio') ?? []) as RadioElement[]
}

function syncChildRadios(): void {
	for (const radio of getRadios()) {
		if (radio.value === currentValue && radio.checked !== true) {
			radio.setChecked?.(true, { silent: true })
		} else if (radio.value !== currentValue && radio.checked === true) {
			radio.uncheck?.({ silent: true })
		}
		radio.tabIndex = getRadioTabIndex(radio.value)
	}
}

function setValue(nextValue: string, { silent = false }: { silent?: boolean } = {}): void {
	const oldValue = currentValue
	if (Object.is(oldValue, nextValue)) return

	currentValue = nextValue
	value = currentValue
	syncChildRadios()
	if (!silent && oldValue !== currentValue) {
		emitChange(oldValue)
	}
}

function emitChange(oldValue: string): void {
	if (!groupElement) return
	onchange?.(currentValue, oldValue)
	groupElement.dispatchEvent(new CustomEvent('change', {
		bubbles: true,
		detail: { value: currentValue, oldValue, target: groupElement }
	}))
}

function handleChange(event: Event): void {
	const radio = event.target as RadioElement
	if (!radio?.classList?.contains('goo-radio') || !radio.checked) return
	event.stopPropagation()
	setValue(radio.value)
}

function handleKeydown(event: KeyboardEvent): void {
	if (disabled) return
	const radios = getRadios()
	if (radios.length === 0) return
	let direction = 0
	if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') direction = -1
	if (event.key === 'ArrowDown' || event.key === 'ArrowRight') direction = 1
	if (!direction) return
	containKeyboardEvent(event)
	const focusedIndex = radios.findIndex(radio => radio === document.activeElement)
	const checkedIndex = radios.findIndex(radio => radio.checked)
	const currentIndex = Math.max(0, focusedIndex >= 0 ? focusedIndex : checkedIndex)
	const nextIndex = (currentIndex + direction + radios.length) % radios.length
	radios[nextIndex].focus()
	radios[nextIndex].check()
}

function getRadioTabIndex(nextValue: string): number {
	if (disabled) return -1
	return nextValue === currentValue ? tabIndex : -1
}
</script>

<div
	{...rest}
	bind:this={groupElement}
	class={classes}
	{style}
	role="radiogroup"
	aria-required={required ? 'true' : undefined}
	aria-disabled={disabled ? 'true' : undefined}
	data-layout={layout}
	{...hostAttributes}
	onchange={handleChange}
	onkeydown={handleKeydown}
>
	<div class="goo-radio-group__options">
		{#if children}
			{@render children()}
		{:else}
			{#each normalizedOptions as option (option.value)}
				<GooRadio
					value={option.value}
					label={option.label}
					{name}
					{disabled}
					checked={option.value === currentValue}
					tabIndex={getRadioTabIndex(option.value)}
				/>
			{/each}
		{/if}
	</div>
	{#if name}
		<input class="goo-radio-group__input" type="hidden" {name} value={currentValue} disabled={disabled || !currentValue} />
	{/if}
</div>
