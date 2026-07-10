<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte angle input component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		ariaLabel: 'ariaLabel',
		name: 'name',
		unit: 'unit'
	}
}
</script>

<script lang="ts">
import './GooAngleInput.css'

import GooNumber from '../input/GooNumber.svelte'
import { containKeyboardEvent } from '../support/keyboard/_keyboardActivation.ts'
import { createPointerDrag, type GooPointerDragEvent, type GooPointerDragHandle } from '../support/utils/pointerDrag.ts'
import type {
	GooAngleInputElement,
	GooAngleInputEventData,
	GooAngleInputProps,
	GooAngleInputUnit
} from './types.ts'

let angleRoot: HTMLDivElement | undefined = $state()
// The root <div> is augmented with the GooAngleInput API at runtime
// (assignAngleInputApi); expose the augmented type while binding the real one.
const angleInputElement = $derived(angleRoot as GooAngleInputElement | undefined)
let trackElement: HTMLButtonElement | undefined = $state()
let activePointerId = $state<number | null>(null)
let currentValue = $state(0)
let lastCommittedValue = $state(0)
let currentUnit: GooAngleInputUnit = $state('degree')
let effectiveDisabled = $state(false)
let skipNextValueSync = false
let pointerDragHandle: GooPointerDragHandle | null = null

let {
	value = $bindable<number | string>(0),
	unit = 'degree',
	name,
	id,
	title,
	ariaLabel,
	disabled = false,
	class: className = '',
	style,
	tabIndex = 0,
	children,
	element = $bindable<GooAngleInputElement | null>(null),
	onchange,
	oninput,
	...rest
}: GooAngleInputProps = $props()

const activeUnit = $derived(currentUnit)
const degrees = $derived(normalizeDegrees(toDegrees(currentValue, activeUnit)))
const rotation = $derived(degrees + 180)

const classes = $derived.by(() => {
	const values = [ 'goo-angle-input' ]
	if (effectiveDisabled) values.push('goo-angle-input--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

// Custom host attributes (CSS / external-query hooks) spread so svelte-check
// does not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | number | undefined>>({
	value: currentValue,
	unit: activeUnit,
	disabled: effectiveDisabled ? '' : undefined
})

$effect(() => {
	const nextValue = parseAngleValue(value)
	if (skipNextValueSync && Object.is(nextValue, currentValue)) {
		skipNextValueSync = false
		return
	}
	currentValue = nextValue
	lastCommittedValue = nextValue
})

$effect(() => {
	currentUnit = normalizeUnit(unit)
})

$effect(() => {
	effectiveDisabled = Boolean(disabled)
})

$effect(() => {
	const track = trackElement
	if (!track) return
	pointerDragHandle?.detach()
	pointerDragHandle = createPointerDrag(track, handlePointerDrag)
	return () => {
		pointerDragHandle?.detach()
		pointerDragHandle = null
	}
})

$effect(() => {
	if (!angleInputElement) {
		element = null
		return
	}

	assignAngleInputApi(angleInputElement)
	element = angleInputElement
})

export function setValue(nextValue: number | string, { silent = true }: { silent?: boolean } = {}): void {
	const oldValue = currentValue
	currentValue = parseAngleValue(nextValue)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		if (!silent) {
			lastCommittedValue = currentValue
			emitAngleInputEvent('set')
		}
	}
}

export function getValue(): number {
	return currentValue
}

export function focus(): void {
	angleInputElement?.querySelector<HTMLInputElement>('.goo-number__content')?.focus()
}

export function blur(): void {
	angleInputElement?.querySelector<HTMLInputElement>('.goo-number__content')?.blur()
}

function assignAngleInputApi(angleInput: GooAngleInputElement): void {
	Object.defineProperties(angleInput, {
		value: {
			configurable: true,
			get: () => currentValue,
			set: value => {
				setValue(value, { silent: true })
			}
		},
		unit: {
			configurable: true,
			get: () => activeUnit,
			set: value => {
				currentUnit = normalizeUnit(value)
			}
		}
	})

	angleInput.setValue = (nextValue, { silent = false } = {}) => setValue(nextValue, { silent })
	angleInput.getValue = () => getValue()
	angleInput.enable = () => {
		effectiveDisabled = false
	}
	angleInput.disable = () => {
		effectiveDisabled = true
	}
	angleInput.focus = () => focus()
	angleInput.blur = () => blur()
}

function handleNumberInput(nextDegrees: number): void {
	if (effectiveDisabled) return
	setAngleFromDegrees(nextDegrees, 'input')
}

function handleNumberChange(nextDegrees: number): void {
	if (effectiveDisabled) return
	setAngleFromDegrees(nextDegrees, 'change')
}

function handleNumberBlur(): void {
	if (effectiveDisabled || currentValue === lastCommittedValue) return
	lastCommittedValue = currentValue
	emitAngleInputEvent('change')
}

function handlePointerDrag(event: GooPointerDragEvent): void | false {
	event.preventDefault()

	if (event.START) {
		if (effectiveDisabled || !trackElement) return false
		focus()
		activePointerId = event.pointerId
		setAngleFromPointer(event.originalEvent, 'input')
		return
	}

	if (activePointerId !== event.pointerId) return

	if (event.CHANGE) {
		if (!effectiveDisabled) setAngleFromPointer(event.originalEvent, 'input')
		return
	}

	activePointerId = null
	if (!event.CANCEL) {
		focus()
		lastCommittedValue = currentValue
		emitAngleInputEvent('change', event.originalEvent)
	}
}

function handleTrackKeydown(event: KeyboardEvent): void {
	if (effectiveDisabled) return

	const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1
	let nextDegrees: number | null = null
	switch (event.key) {
		case 'ArrowLeft':
		case 'ArrowDown':
			nextDegrees = degrees - multiplier
			break
		case 'ArrowRight':
		case 'ArrowUp':
			nextDegrees = degrees + multiplier
			break
		case 'Home':
			nextDegrees = 0
			break
		case 'End':
			nextDegrees = 359
			break
		default:
			return
	}

	containKeyboardEvent(event)
	setAngleFromDegrees(nextDegrees, 'change', event)
}

function setAngleFromPointer(event: PointerEvent, state: GooAngleInputEventData['state']): void {
	if (!trackElement) return

	const rect = trackElement.getBoundingClientRect()
	const centerX = rect.left + rect.width / 2
	const centerY = rect.top + rect.height / 2
	const nextDegrees = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90
	setAngleFromDegrees(nextDegrees, state, event)
}

function setAngleFromDegrees(nextDegrees: number, state: GooAngleInputEventData['state'], event?: Event): void {
	currentValue = fromDegrees(normalizeDegrees(nextDegrees), activeUnit)
	syncBoundValue(currentValue)
	if (state !== 'input') {
		lastCommittedValue = currentValue
	}
	emitAngleInputEvent(state, event)
}

function emitAngleInputEvent(state: GooAngleInputEventData['state'], event?: Event): void {
	if (!angleInputElement) return

	const data: GooAngleInputEventData = {
		angleInput: angleInputElement,
		value: currentValue,
		state,
		event
	}

	if (state === 'input') {
		oninput?.(currentValue, data)
		angleInputElement.dispatchEvent(new CustomEvent('input', { detail: data, bubbles: true }))
	} else {
		onchange?.(currentValue, data)
		angleInputElement.dispatchEvent(new CustomEvent('change', { detail: data, bubbles: true }))
	}
}

/* Wraps into [0, 360) without rounding: display precision is the number
   field's concern (degrees format at hundredths); the bound value keeps
   full precision. */
function normalizeDegrees(nextValue: number): number {
	if (!Number.isFinite(nextValue)) return 0
	return ((nextValue % 360) + 360) % 360
}

function toDegrees(nextValue: number, nextUnit: GooAngleInputUnit): number {
	return nextUnit === 'radian' ? nextValue * 180 / Math.PI : nextValue
}

function fromDegrees(nextValue: number, nextUnit: GooAngleInputUnit): number {
	return nextUnit === 'radian' ? nextValue * Math.PI / 180 : nextValue
}

function parseAngleValue(nextValue: number | string | undefined): number {
	const parsed = Number.parseFloat(String(nextValue ?? 0))
	return Number.isFinite(parsed) ? parsed : 0
}

function normalizeUnit(nextUnit: unknown): GooAngleInputUnit {
	return nextUnit === 'radian' ? 'radian' : 'degree'
}

function syncBoundValue(nextValue: number): void {
	skipNextValueSync = true
	value = nextValue
}
</script>

<div
	{...rest}
	bind:this={angleRoot}
	{id}
	class={classes}
	{title}
	{style}
	{...hostAttributes}
	aria-disabled={effectiveDisabled ? 'true' : undefined}
>
	<button
		bind:this={trackElement}
		type="button"
		class="goo-angle-input__track"
		class:is-dragging={activePointerId !== null}
		tabindex={effectiveDisabled ? -1 : tabIndex}
		aria-label={ariaLabel || 'Set angle'}
		onkeydowncapture={handleTrackKeydown}
	>
		<div
			class="goo-angle-input__handle"
			tabindex="-1"
			style:transform={`rotate(${ rotation }deg)`}
		></div>
	</button>
	<div
		class="goo-angle-input__number"
		oninput={(event) => event.stopPropagation()}
		onchange={(event) => event.stopPropagation()}
	>
		<GooNumber
			value={degrees}
			min={0}
			max={360}
			unit="degree"
			disabled={effectiveDisabled}
			{tabIndex}
			oninput={handleNumberInput}
			onchange={handleNumberChange}
			onblur={handleNumberBlur}
		/>
	</div>
	{#if children}
		{@render children()}
	{/if}
	{#if name}
		<input type="hidden" data-goo-angle-input-field {name} value={currentValue} disabled={effectiveDisabled} />
	{/if}
</div>
