<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte color component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		alpha: 'alpha',
		nativePicker: 'nativePicker',
		name: 'name'
	}
}
</script>

<script lang="ts">
import './GooColor.css'

import { parseCssColorOrNull, rgbaToCssHex, rgbToHex } from './_cssColor.ts'
import type { GooColorElement, GooColorEventData, GooColorProps } from './types.ts'

let colorRoot: HTMLDivElement | undefined = $state()
// The root <div> is augmented with the GooColor API at runtime (assignColorApi),
// so expose it under the augmented type while binding to the real element type.
const colorElement = $derived(colorRoot as GooColorElement | undefined)
let pickerElement: HTMLInputElement | undefined = $state()
let inputElement: HTMLInputElement | undefined = $state()
let alphaElement: HTMLInputElement | undefined = $state()
let currentValue = $state('#000000')
let lastCommittedValue = $state('#000000')
let effectiveDisabled = $state(false)
let skipNextValueSync = false

let {
	value = $bindable('#000000'),
	alpha = false,
	nativePicker = true,
	name,
	id,
	title,
	disabled = false,
	class: className = '',
	style,
	tabIndex = 0,
	children,
	element = $bindable<GooColorElement | null>(null),
	onchange,
	oninput,
	...rest
}: GooColorProps = $props()

const hexValue = $derived(toHex(currentValue))
const swatchColor = $derived(getSwatchColor(currentValue, alpha))
const alphaValue = $derived(Math.round(getAlpha(currentValue) * 100))

const classes = $derived.by(() => {
	const values = [ 'goo-color' ]
	if (effectiveDisabled) values.push('goo-color--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

// Custom host attributes (CSS / external-query hooks) spread so svelte-check
// does not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | undefined>>({
	value: currentValue,
	alpha: alpha ? '' : undefined,
	disabled: effectiveDisabled ? '' : undefined
})

$effect(() => {
	const nextValue = normalizeColorValue(value, alpha)
	if (skipNextValueSync && Object.is(nextValue, currentValue)) {
		skipNextValueSync = false
		return
	}
	currentValue = nextValue
	lastCommittedValue = nextValue
})

$effect(() => {
	effectiveDisabled = Boolean(disabled)
})

$effect(() => {
	if (!colorElement) {
		element = null
		return
	}

	assignColorApi(colorElement)
	colorElement.setAttribute('value', currentValue)
	element = colorElement
})

export function setValue(nextValue: string, { silent = true }: { silent?: boolean } = {}): void {
	const oldValue = currentValue
	currentValue = normalizeColorValue(nextValue, alpha)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		if (!silent) {
			lastCommittedValue = currentValue
			emitColorEvent('set')
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

function assignColorApi(color: GooColorElement): void {
	Object.defineProperty(color, 'value', {
		configurable: true,
		get: () => currentValue,
		set: nextValue => {
			setValue(String(nextValue), { silent: true })
		}
	})

	color.setValue = (nextValue, { silent = false } = {}) => setValue(nextValue, { silent })
	color.getValue = () => getValue()
	color.enable = () => {
		effectiveDisabled = false
	}
	color.disable = () => {
		effectiveDisabled = true
	}
	color.focus = () => focus()
	color.blur = () => blur()
}

function openPicker(): void {
	if (!effectiveDisabled && nativePicker) pickerElement?.click()
}

function handlePickerInput(event: Event): void {
	event.stopPropagation()
	setColorValue(pickerElement?.value ?? currentValue, 'input', event)
}

function handlePickerChange(event: Event): void {
	event.stopPropagation()
	commitColorValue(pickerElement?.value ?? currentValue, event)
}

function handleTextInput(event: Event): void {
	event.stopPropagation()
	const nextValue = parseInputValue(inputElement?.value)
	if (nextValue) setColorValue(nextValue, 'input', event)
}

function handleTextChange(event: Event): void {
	event.stopPropagation()
	const nextValue = parseInputValue(inputElement?.value)
	if (nextValue) {
		commitColorValue(nextValue, event)
	} else if (inputElement) {
		inputElement.value = hexValue
	}
}

function handleAlphaInput(event: Event): void {
	event.stopPropagation()
	setAlphaValue(getAlphaSliderValue(), 'input', event)
}

function handleAlphaChange(event: Event): void {
	event.stopPropagation()
	commitAlphaValue(getAlphaSliderValue(), event)
}

function setColorValue(nextValue: string, state: GooColorEventData['state'], event?: Event): void {
	if (effectiveDisabled) return

	const oldValue = currentValue
	currentValue = normalizeColorValue(nextValue, alpha)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		emitColorEvent(state, event)
	}
}

function commitColorValue(nextValue: string, event?: Event): void {
	if (effectiveDisabled) return

	currentValue = normalizeColorValue(nextValue, alpha)
	if (lastCommittedValue !== currentValue) {
		syncBoundValue(currentValue)
		lastCommittedValue = currentValue
		emitColorEvent('change', event)
	}
}

function setAlphaValue(nextAlpha: number, state: GooColorEventData['state'], event?: Event): void {
	if (effectiveDisabled) return

	const parsed = parseCssColorOrNull(currentValue) ?? { r: 0, g: 0, b: 0 }
	const oldValue = currentValue
	currentValue = rgbaToCssHex(parsed.r / 255, parsed.g / 255, parsed.b / 255, nextAlpha)
	if (oldValue !== currentValue) {
		syncBoundValue(currentValue)
		emitColorEvent(state, event)
	}
}

function commitAlphaValue(nextAlpha: number, event?: Event): void {
	if (effectiveDisabled) return

	const parsed = parseCssColorOrNull(currentValue) ?? { r: 0, g: 0, b: 0 }
	currentValue = rgbaToCssHex(parsed.r / 255, parsed.g / 255, parsed.b / 255, nextAlpha)
	if (lastCommittedValue !== currentValue) {
		syncBoundValue(currentValue)
		lastCommittedValue = currentValue
		emitColorEvent('change', event)
	}
}

function emitColorEvent(state: GooColorEventData['state'], event?: Event): void {
	if (!colorElement) return

	const data: GooColorEventData = {
		color: colorElement,
		value: currentValue,
		state,
		event
	}
	if (state === 'input') {
		oninput?.(currentValue, data)
		colorElement.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: data }))
		return
	}
	onchange?.(currentValue, data)
	colorElement.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: data }))
}

function normalizeColorValue(nextValue: string, withAlpha = false): string {
	const hex = toHex(nextValue)
	if (!withAlpha) return hex
	const nextAlpha = getAlpha(nextValue)
	const parsed = parseCssColorOrNull(hex) ?? { r: 0, g: 0, b: 0 }
	return rgbaToCssHex(parsed.r / 255, parsed.g / 255, parsed.b / 255, nextAlpha)
}

function toHex(color: string): string {
	const parsed = parseCssColorOrNull(color)
	return parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : '#000000'
}

function getAlpha(color: string): number {
	return parseCssColorOrNull(color)?.a ?? 1
}

function getSwatchColor(nextValue: string, withAlpha: boolean): string {
	if (!withAlpha) return toHex(nextValue)
	const hex = toHex(nextValue)
	const nextAlpha = getAlpha(nextValue)
	const r = Number.parseInt(hex.slice(1, 3), 16)
	const g = Number.parseInt(hex.slice(3, 5), 16)
	const b = Number.parseInt(hex.slice(5, 7), 16)
	return `rgba(${ r }, ${ g }, ${ b }, ${ nextAlpha })`
}

function parseInputValue(nextValue?: string): string | null {
	if (!nextValue) return null
	const normalized = nextValue.trim().startsWith('#') ? nextValue.trim() : `#${ nextValue.trim() }`
	return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : null
}

function getAlphaSliderValue(): number {
	return Number.parseFloat(alphaElement?.value ?? '100') / 100
}

function syncBoundValue(nextValue: string): void {
	skipNextValueSync = true
	value = nextValue
}

type ColorInputKind = 'alpha' | 'picker' | 'text'

function wireColorEvents(node: HTMLInputElement, kind: ColorInputKind) {
	const onInput = (event: Event) => {
		event.stopPropagation()
		if (kind === 'alpha') handleAlphaInput(event)
		if (kind === 'picker') handlePickerInput(event)
		if (kind === 'text') handleTextInput(event)
	}
	const onChange = (event: Event) => {
		event.stopPropagation()
		if (kind === 'alpha') handleAlphaChange(event)
		if (kind === 'picker') handlePickerChange(event)
		if (kind === 'text') handleTextChange(event)
	}
	const onBlur = (event: Event) => {
		if (kind !== 'text') return
		event.stopPropagation()
		handleTextChange(event)
	}
	node.addEventListener('input', onInput)
	node.addEventListener('change', onChange)
	if (kind === 'text') node.addEventListener('blur', onBlur)
	return {
		destroy() {
			node.removeEventListener('input', onInput)
			node.removeEventListener('change', onChange)
			node.removeEventListener('blur', onBlur)
		}
	}
}
</script>

<div
	{...rest}
	bind:this={colorRoot}
	{id}
	class={classes}
	{title}
	{style}
	{...hostAttributes}
	aria-disabled={effectiveDisabled ? 'true' : undefined}
>
	<div class="goo-color__pill">
		{#if nativePicker}
			<button
				type="button"
				class="goo-color__swatch"
				style:--swatch-color={swatchColor}
				disabled={effectiveDisabled}
				aria-label="Choose color"
				onclick={openPicker}
			></button>
			<input
				bind:this={pickerElement}
				type="color"
				class="goo-color__picker"
				value={hexValue}
				disabled={effectiveDisabled}
				tabindex={tabIndex}
				use:wireColorEvents={'picker'}
			/>
		{:else}
			<span
				class="goo-color__swatch goo-color__swatch--static"
				style:--swatch-color={swatchColor}
				aria-hidden="true"
			></span>
		{/if}
		<input
			bind:this={inputElement}
			type="text"
			class="goo-color__input"
			aria-label="Hex color"
			value={hexValue}
			maxlength="7"
			disabled={effectiveDisabled}
			tabindex={tabIndex}
			use:wireColorEvents={'text'}
		/>
	</div>
	{#if alpha}
		<input
			bind:this={alphaElement}
			type="range"
			class="goo-color__alpha"
			aria-label="Alpha"
			min="0"
			max="100"
			value={alphaValue}
			disabled={effectiveDisabled}
			tabindex={tabIndex}
			use:wireColorEvents={'alpha'}
		/>
	{/if}
	{#if children}
		{@render children()}
	{/if}
	{#if name}
		<input type="hidden" data-goo-color-field {name} value={currentValue} disabled={effectiveDisabled} />
	{/if}
</div>
