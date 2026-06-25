<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte XY pad component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		ariaLabel: 'ariaLabel',
		label: 'label',
		max: 'max',
		min: 'min',
		name: 'name',
		resettable: 'resettable',
		showInputs: 'showInputs',
		snap: 'snap',
		step: 'step',
		unit: 'unit'
	}
}
</script>

<script lang="ts">
import './GooXyPad.css'

import { onDestroy } from 'svelte'

import GooNumber from '../input/GooNumber.svelte'
import { clamp, roundToStep } from '../support/utils/numberUtils.ts'
import { createPointerDrag, type GooPointerDragEvent, type GooPointerDragHandle } from '../support/utils/pointerDrag.ts'
import type { GooXyPadElement, GooXyPadEventData, GooXyPadProps, GooXyPadValue } from './types.ts'

const DEFAULT_MIN = -100
const DEFAULT_MAX = 100
const DEFAULT_STEP = 1

let {
	value = $bindable<GooXyPadValue | number[] | null>({ x: 0, y: 0 }),
	min = DEFAULT_MIN,
	max = DEFAULT_MAX,
	step = DEFAULT_STEP,
	unit = '',
	label,
	name,
	id,
	title,
	ariaLabel,
	'aria-label': ariaLabelAttribute,
	disabled = false,
	class: className = '',
	style,
	tabIndex = 0,
	snap = 0,
	showInputs = true,
	resettable = true,
	children,
	element = $bindable<GooXyPadElement | null>(null),
	onchange,
	oninput,
	...rest
}: GooXyPadProps = $props()

let rootElement: HTMLDivElement | undefined = $state()
let surfaceElement: HTMLButtonElement | undefined = $state()
const xyPadElement = $derived(rootElement as GooXyPadElement | undefined)
let activePointerId = $state<number | null>(null)
let latestValue = $state<GooXyPadValue>(normalizeValue(value))
let currentValue = $state<GooXyPadValue>(normalizeValue(value))
let effectiveDisabled = $state(false)
let lastExternalValue: GooXyPadValue = normalizeValue(value)
let pendingInternalValue = $state<GooXyPadValue | null>(null)
let pendingExternalFallback = $state<GooXyPadValue | null>(null)
let ignoreNumberEvents = $state(false)
let pointerDragHandle: GooPointerDragHandle | null = null
let ignoreNumberEventsTimer: ReturnType<typeof setTimeout> | null = null

const range = $derived(Math.max(max - min, Number.EPSILON))
const xPct = $derived(toPercent(currentValue.x))
const yPct = $derived(100 - toPercent(currentValue.y))
const centerValue = $derived(toSteppedValue((min + max) / 2))
const classes = $derived.by(() => {
	const values = [ 'goo-xy-pad' ]
	if (effectiveDisabled) values.push('goo-xy-pad--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})
const hostAttributes = $derived<Record<string, string | number | undefined>>({
	value: `${ currentValue.x },${ currentValue.y }`,
	disabled: effectiveDisabled ? '' : undefined
})
const padLabel = $derived(ariaLabel || ariaLabelAttribute || label || title || 'Set X Y value')

$effect(() => {
	const nextExternalValue = normalizeValue(value)
	if (pendingInternalValue) {
		if (sameValue(nextExternalValue, pendingInternalValue)) {
			lastExternalValue = cloneValue(nextExternalValue)
			return
		}
		if (pendingExternalFallback && sameValue(nextExternalValue, pendingExternalFallback)) {
			pendingInternalValue = null
			pendingExternalFallback = null
			return
		}
		pendingInternalValue = null
		pendingExternalFallback = null
	}
	if (sameValue(nextExternalValue, lastExternalValue)) {
		return
	}
	lastExternalValue = cloneValue(nextExternalValue)
	commitCurrentValue(nextExternalValue)
})

$effect(() => {
	effectiveDisabled = Boolean(disabled)
})

$effect(() => {
	const surface = surfaceElement
	if (!surface) return
	pointerDragHandle?.detach()
	pointerDragHandle = createPointerDrag(surface, handlePointerDrag)
	return () => {
		pointerDragHandle?.detach()
		pointerDragHandle = null
	}
})

onDestroy(() => {
	clearIgnoreNumberEventsTimer()
})

$effect(() => {
	if (!xyPadElement) {
		element = null
		return
	}
	assignXyPadApi(xyPadElement)
	element = xyPadElement
})

export function setValue(nextValue: GooXyPadValue | number[] | null | undefined, { silent = true }: { silent?: boolean } = {}): void {
	const normalized = normalizeValue(nextValue)
	const changed = !sameValue(normalized, latestValue)
	commitCurrentValue(normalized)
	syncBoundValue(normalized)
	if (!silent && changed) {
		emitXyPadEvent('change')
	}
}

export function getValue(): GooXyPadValue {
	return cloneValue(latestValue)
}

export function focus(): void {
	surfaceElement?.focus()
}

export function blur(): void {
	surfaceElement?.blur()
}

function assignXyPadApi(xyPad: GooXyPadElement): void {
	Object.defineProperty(xyPad, 'value', {
		configurable: true,
		get: () => cloneValue(latestValue),
		set: value => setValue(value, { silent: true })
	})
	xyPad.setValue = (nextValue, { silent = true } = {}) => setValue(nextValue, { silent })
	xyPad.getValue = () => getValue()
	xyPad.enable = () => {
		effectiveDisabled = false
	}
	xyPad.disable = () => {
		effectiveDisabled = true
	}
	xyPad.focus = () => focus()
	xyPad.blur = () => blur()
}

function handlePointerDrag(event: GooPointerDragEvent): void | false {
	event.preventDefault()

	if (event.START) {
		if (effectiveDisabled || !surfaceElement) return false
		focus()
		activePointerId = event.pointerId
		setValueFromPointer(event.originalEvent, 'input')
		return
	}

	if (activePointerId !== event.pointerId) return

	if (event.CHANGE) {
		if (!effectiveDisabled) setValueFromPointer(event.originalEvent, 'input')
		return
	}

	activePointerId = null
	if (!event.CANCEL) {
		emitXyPadEvent('change', event.originalEvent)
	}
}

function setValueFromPointer(event: PointerEvent, state: GooXyPadEventData['state']): void {
	if (!surfaceElement) return
	const rect = surfaceElement.getBoundingClientRect()
	const nextX = min + clamp((event.clientX - rect.left) / rect.width, 0, 1) * range
	const nextY = max - clamp((event.clientY - rect.top) / rect.height, 0, 1) * range
	updateValue({ x: nextX, y: nextY }, state, event)
}

function handleKeydown(event: KeyboardEvent): void {
	if (effectiveDisabled) return
	const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1
	const delta = (step || DEFAULT_STEP) * multiplier
	let nextValue: GooXyPadValue | null = null
	if (event.key === 'ArrowLeft') nextValue = { ...latestValue, x: latestValue.x - delta }
	if (event.key === 'ArrowRight') nextValue = { ...latestValue, x: latestValue.x + delta }
	if (event.key === 'ArrowDown') nextValue = { ...latestValue, y: latestValue.y - delta }
	if (event.key === 'ArrowUp') nextValue = { ...latestValue, y: latestValue.y + delta }
	if (event.key === 'Home') nextValue = { x: centerValue, y: centerValue }
	if (!nextValue) return
	event.preventDefault()
	updateValue(nextValue, 'change', event)
}

function handleNumberChange(axis: keyof GooXyPadValue, nextValue: number): void {
	if (ignoreNumberEvents) return
	updateValue({ ...latestValue, [axis]: nextValue }, 'change')
}

function resetToCenter(): void {
	if (effectiveDisabled) return
	updateValue({ x: centerValue, y: centerValue }, 'change')
	focus()
}

function updateValue(nextValue: GooXyPadValue, state: GooXyPadEventData['state'], event?: Event): void {
	const normalized = normalizeValue(nextValue)
	const changed = !sameValue(normalized, latestValue)
	commitCurrentValue(normalized)
	syncBoundValue(normalized)
	if (changed || state !== 'input') {
		emitXyPadEvent(state, event)
	}
}

function emitXyPadEvent(state: GooXyPadEventData['state'], event?: Event): void {
	if (!xyPadElement) return
	const nextValue = cloneValue(latestValue)
	const data: GooXyPadEventData = {
		element: xyPadElement,
		event,
		state,
		value: nextValue
	}
	if (state === 'input') {
		oninput?.(nextValue, data)
		xyPadElement.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: data }))
	} else {
		onchange?.(nextValue, data)
		xyPadElement.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: data }))
	}
}

function normalizeValue(nextValue: GooXyPadValue | number[] | null | undefined): GooXyPadValue {
	if (Array.isArray(nextValue)) {
		return {
			x: toSteppedValue(nextValue[0]),
			y: toSteppedValue(nextValue[1])
		}
	}
	return {
		x: toSteppedValue(nextValue?.x),
		y: toSteppedValue(nextValue?.y)
	}
}

function toSteppedValue(nextValue: unknown): number {
	const numericValue = Number(nextValue)
	const finiteValue = Number.isFinite(numericValue) ? numericValue : 0
	const snappedValue = snap > 0 && Math.abs(finiteValue) <= snap ? 0 : finiteValue
	return clamp(roundToStep(snappedValue, step || DEFAULT_STEP, min), min, max)
}

function toPercent(nextValue: number): number {
	return clamp((nextValue - min) / range, 0, 1) * 100
}

function sameValue(a: GooXyPadValue, b: GooXyPadValue): boolean {
	return Object.is(a.x, b.x) && Object.is(a.y, b.y)
}

function cloneValue(nextValue: GooXyPadValue): GooXyPadValue {
	return { x: nextValue.x, y: nextValue.y }
}

function commitCurrentValue(nextValue: GooXyPadValue): void {
	latestValue = nextValue
	ignoreNumberEvents = true
	currentValue = nextValue
	clearIgnoreNumberEventsTimer()
	ignoreNumberEventsTimer = setTimeout(() => {
		ignoreNumberEvents = false
		ignoreNumberEventsTimer = null
	}, 0)
}

function clearIgnoreNumberEventsTimer(): void {
	if (ignoreNumberEventsTimer === null) return
	clearTimeout(ignoreNumberEventsTimer)
	ignoreNumberEventsTimer = null
}

function syncBoundValue(nextValue: GooXyPadValue): void {
	pendingInternalValue = cloneValue(nextValue)
	pendingExternalFallback = cloneValue(lastExternalValue)
	value = cloneValue(nextValue)
}
</script>

<div
	{...rest}
	bind:this={rootElement}
	{id}
	class={classes}
	{title}
	{style}
	{...hostAttributes}
	aria-disabled={effectiveDisabled ? 'true' : undefined}
>
	<button
		bind:this={surfaceElement}
		type="button"
		class="goo-xy-pad__surface"
		class:is-dragging={activePointerId !== null}
		disabled={effectiveDisabled}
		tabindex={tabIndex}
		aria-label={padLabel}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={currentValue.x}
		aria-valuetext={`X ${ currentValue.x }, Y ${ currentValue.y }`}
		role="slider"
		style={`--goo-xy-pad-dot-x: ${ xPct }%; --goo-xy-pad-dot-y: ${ yPct }%;`}
		onkeydown={handleKeydown}
	>
		<span class="goo-xy-pad__dot" aria-hidden="true"></span>
	</button>
	{#if showInputs}
		<div class="goo-xy-pad__inputs" oninput={(event) => event.stopPropagation()} onchange={(event) => event.stopPropagation()}>
			<label class="goo-xy-pad__input">
				<span class="goo-xy-pad__input-label">X</span>
				<GooNumber
					value={currentValue.x}
					{min}
					{max}
					{step}
					{unit}
					disabled={effectiveDisabled}
					tabIndex={tabIndex}
					ariaLabel={`${ label || 'Value' } X`}
					onchange={(nextValue) => handleNumberChange('x', nextValue)}
				/>
			</label>
			<label class="goo-xy-pad__input">
				<span class="goo-xy-pad__input-label">Y</span>
				<GooNumber
					value={currentValue.y}
					{min}
					{max}
					{step}
					{unit}
					disabled={effectiveDisabled}
					tabIndex={tabIndex}
					ariaLabel={`${ label || 'Value' } Y`}
					onchange={(nextValue) => handleNumberChange('y', nextValue)}
				/>
			</label>
		</div>
	{/if}
	{#if resettable}
		<button type="button" class="goo-xy-pad__reset" disabled={effectiveDisabled} onclick={resetToCenter}>
			Center
		</button>
	{/if}
	{#if children}
		{@render children()}
	{/if}
	{#if name}
		<input type="hidden" data-goo-xy-pad-x-field name={`${ name }.x`} value={currentValue.x} disabled={effectiveDisabled} />
		<input type="hidden" data-goo-xy-pad-y-field name={`${ name }.y`} value={currentValue.y} disabled={effectiveDisabled} />
	{/if}
</div>
