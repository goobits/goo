<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte number input component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		max: 'max',
		inputId: 'inputId',
		min: 'min',
		name: 'name',
		size: 'size',
		step: 'step',
		unit: 'unit'
	}
}
</script>

<script lang="ts">
import { onDestroy } from 'svelte'
import '../field/goo-field.css'
import './GooNumber.css'

import { formatNumber } from '../support/utils/formatNumber.ts'
import { clamp, roundToStep } from '../support/utils/numberUtils.ts'
import type { GooNumberProps } from './types.ts'

const HOLD_DELAY = 250
const REPEAT_INTERVAL = 50

let numberElement: HTMLDivElement | undefined = $state()
let contentElement: HTMLInputElement | undefined = $state()
let currentValue = $state(0)
let lastCommittedValue = $state(0)
let textValue = $state('')
let changePulseClass = $state('')
let holdTimeout: ReturnType<typeof setTimeout> | null = null
let repeatInterval: ReturnType<typeof setInterval> | null = null
let changePulseTimeout: ReturnType<typeof setTimeout> | null = null
let skipNextValueSync = false

let {
	value = $bindable(0),
	min = -Infinity,
	max = Infinity,
	step = 1,
	unit = '',
	inputId,
	ariaLabel,
	'aria-label': ariaLabelAttribute,
	name = '',
	title,
	disabled = false,
	size,
	class: className = '',
	style,
	tabIndex = 0,
	oninput,
	onchange,
	onenter,
	onfocus,
	onblur,
	...rest
}: GooNumberProps = $props()

// Custom host attributes (CSS/web-component hooks) spread so svelte-check does
// not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | number | undefined>>({
	size,
	unit,
	value: currentValue,
	min,
	max,
	step,
	disabled: disabled ? '' : undefined
})

$effect(() => {
	const nextValue = clamp(Number(value), min, max)
	if (skipNextValueSync && Object.is(nextValue, currentValue)) {
		skipNextValueSync = false
		return
	}
	currentValue = nextValue
	textValue = formatDisplayValue(nextValue)
	lastCommittedValue = nextValue
})

$effect(() => {
	if (disabled) stopHold()
})

onDestroy(() => {
	if (holdTimeout) clearTimeout(holdTimeout)
	if (repeatInterval) clearInterval(repeatInterval)
	if (changePulseTimeout) clearTimeout(changePulseTimeout)
})

const classes = $derived.by(() => {
	const values = [ 'goo-number' ]
	if (disabled) values.push('goo-number--disabled')
	if (changePulseClass) values.push('goo-number--changed', changePulseClass)
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})
const unitSuffix = $derived(getUnitSuffix(unit))
const inputAccessibleName = $derived(
	trimmedTextValue(ariaLabel)
	|| trimmedTextValue(ariaLabelAttribute)
	|| trimmedTextValue(title)
	|| trimmedTextValue(name)
	|| undefined
)
const ariaValueMin = $derived(Number.isFinite(min) ? min : undefined)
const ariaValueMax = $derived(Number.isFinite(max) ? max : undefined)
const rootStyle = $derived.by(() => {
	const values = []
	if (style) values.push(style)
	if (unitSuffix) {
		const unitWidth = Math.max(unitSuffix.length * 0.62, 0.55)
		values.push(`--goo-number-unit-width: ${ unitWidth.toFixed(2) }em`)
	}
	return values.join('; ')
})

export function setValue(nextValue: number, { silent = true }: { silent?: boolean } = {}): void {
	const oldValue = currentValue
	syncValue(Number(nextValue), { format: true })
	if (!silent && oldValue !== currentValue) {
		emitInput(oldValue)
	}
}

export function getValue(): number {
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

function syncValue(nextValue: number, { format }: { format: boolean }): void {
	const oldValue = currentValue
	currentValue = clamp(nextValue, min, max)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
	}
	if (format) {
		textValue = formatDisplayValue(currentValue)
	}
	if (oldValue !== currentValue) {
		pulseValueChange()
	}
}

function handleInput(event: Event): void {
	event.stopPropagation()
	if (disabled) return

	const oldValue = currentValue
	textValue = contentElement?.value ?? ''
	currentValue = parseInputValue(textValue)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		pulseValueChange()
		emitInput(oldValue)
	}
}

function handleFocus(event: Event): void {
	event.stopPropagation()
	if (disabled) return

	lastCommittedValue = currentValue
	onfocus?.()
	numberElement?.dispatchEvent(new CustomEvent('focus', { detail: { value: currentValue, target: numberElement } }))
}

function handleBlur(event: Event): void {
	event.stopPropagation()
	if (disabled) return

	const oldValue = lastCommittedValue
	syncValue(parseInputValue(textValue), { format: true })
	if (currentValue !== oldValue) {
		lastCommittedValue = currentValue
		emitChange(oldValue)
	}
	onblur?.()
	numberElement?.dispatchEvent(new CustomEvent('blur', { detail: { value: currentValue, target: numberElement } }))
}

function handleKeydown(event: KeyboardEvent): void {
	event.stopPropagation()
	if (disabled) return

	if (event.key === 'Escape' || event.key === 'Enter') {
		event.preventDefault()
		if (event.key === 'Enter') {
			onenter?.()
			numberElement?.dispatchEvent(new CustomEvent('enter', {
				bubbles: true,
				detail: { value: currentValue, target: numberElement }
			}))
		}
		contentElement?.blur()
	}
	if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
		event.preventDefault()
		increment(event.key === 'ArrowUp' ? 'up' : 'down', event.shiftKey)
	}
}

function handleWheel(event: WheelEvent): void {
	if (disabled || document.activeElement !== contentElement) return

	event.preventDefault()
	increment(event.deltaY < 0 ? 'up' : 'down', event.shiftKey)
}

function startHold(direction: 'down' | 'up', shift: boolean): void {
	stopHold()
	increment(direction, shift)
	holdTimeout = setTimeout(() => {
		repeatInterval = setInterval(() => increment(direction, shift), REPEAT_INTERVAL)
	}, HOLD_DELAY)
}

function stopHold(): void {
	if (holdTimeout) clearTimeout(holdTimeout)
	if (repeatInterval) clearInterval(repeatInterval)
	holdTimeout = null
	repeatInterval = null
}

function increment(direction: 'down' | 'up', shift = false): void {
	let stepValue = getStepValue()
	if (shift) stepValue *= 10

	const oldValue = currentValue
	const nextValue = direction === 'up' ? currentValue + stepValue : currentValue - stepValue
	syncValue(roundToStep(clamp(nextValue, min, max), stepValue, min), { format: true })
	if (oldValue !== currentValue) {
		emitInput(oldValue)
	}
}

function emitInput(oldValue: number): void {
	const detail = { value: currentValue, oldValue, target: numberElement }
	oninput?.(currentValue, oldValue)
	numberElement?.dispatchEvent(new CustomEvent('input', { bubbles: true, detail }))
}

function emitChange(oldValue: number): void {
	const detail = { value: currentValue, oldValue, target: numberElement }
	onchange?.(currentValue, oldValue)
	numberElement?.dispatchEvent(new CustomEvent('change', { bubbles: true, detail }))
}

function syncBoundValue(nextValue: number): void {
	skipNextValueSync = true
	value = nextValue
}

function parseValue(rawValue: string): number {
	const cleaned = String(rawValue).replace(/[^-.0-9]/g, '')
	return Number.parseFloat(cleaned) || 0
}

function getStepValue(): number {
	if (step === 'any') {
		if (unit === '%' && !(min % 1 === 0 && max === 100)) {
			return 0.01
		}
		return 1
	}
	return step
}

function parseInputValue(rawValue: string): number {
	const parsedValue = parseValue(rawValue)
	if (unit === '%' && !(min % 1 === 0 && max === 100)) {
		return parsedValue / 100
	}
	return parsedValue
}

function formatDisplayValue(nextValue: number): string {
	if (!Number.isFinite(nextValue)) return ''
	const formatted = String(formatNumber(nextValue, unit, { min, max, step }))
	if (!unitSuffix || !formatted.endsWith(unitSuffix)) {
		return formatted
	}
	return formatted.slice(0, -unitSuffix.length)
}

function getUnitSuffix(nextUnit: string): string {
	if (!nextUnit || nextUnit === 'float' || nextUnit === 'int' || nextUnit === 'integer' || nextUnit === 'number') {
		return ''
	}
	const suffix = formatNumber(0, nextUnit, { appendFormatSuffix: true, max: 1, min: 0, step: 1 })
		.toString()
		.replace(/^[-.\d]+/, '')
	return suffix
}

function trimmedTextValue(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

function pulseValueChange(): void {
	changePulseClass = changePulseClass === 'goo-number--changed-a'
		? 'goo-number--changed-b'
		: 'goo-number--changed-a'
	if (changePulseTimeout) clearTimeout(changePulseTimeout)
	changePulseTimeout = setTimeout(() => {
		changePulseClass = ''
		changePulseTimeout = null
	}, 340)
}
</script>

<div
	{...rest}
	bind:this={numberElement}
	class={classes}
	style={rootStyle}
	{title}
	{...hostAttributes}
	onpointerdown={(event) => event.stopPropagation()}
>
	<input
		bind:this={contentElement}
		class="goo-number__content"
		type="text"
		role="spinbutton"
		id={inputId}
		aria-label={inputAccessibleName}
		aria-valuemin={ariaValueMin}
		aria-valuemax={ariaValueMax}
		aria-valuenow={currentValue}
		inputmode="decimal"
		{name}
		{disabled}
		tabindex={tabIndex}
		value={textValue}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		onkeyup={(event) => event.stopPropagation()}
		onwheel={handleWheel}
	/>
	{#if unitSuffix}
		<span class="goo-number__unit" aria-hidden="true">{unitSuffix}</span>
	{/if}
	<div class="goo-number__arrows" aria-hidden="true">
		<button
			class="goo-number__arrow goo-number__arrow--up"
			type="button"
			tabindex="-1"
			aria-label="Increment"
			onpointerdown={(event) => {
				if (event.button !== 0) return
				event.preventDefault()
				event.stopPropagation()
				if (!disabled) {
					contentElement?.focus()
					startHold('up', event.shiftKey)
				}
			}}
			onpointerup={stopHold}
			onpointercancel={stopHold}
			onpointerleave={stopHold}
		></button>
		<button
			class="goo-number__arrow goo-number__arrow--down"
			type="button"
			tabindex="-1"
			aria-label="Decrement"
			onpointerdown={(event) => {
				if (event.button !== 0) return
				event.preventDefault()
				event.stopPropagation()
				if (!disabled) {
					contentElement?.focus()
					startHold('down', event.shiftKey)
				}
			}}
			onpointerup={stopHold}
			onpointercancel={stopHold}
			onpointerleave={stopHold}
		></button>
	</div>
</div>
