<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte checkbox component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		ariaLabel: 'ariaLabel',
		formValue: 'formValue',
		label: 'label',
		name: 'name',
		title: 'title'
	}
}
</script>

<script lang="ts">
import { untrack } from 'svelte'
import './GooCheckbox.css'
import { isRTL } from '../i18n/index.ts'
import { clamp } from '../utils/numberUtils.ts'
import { createPointerDrag, type GooPointerDragEvent, type GooPointerDragHandle } from '../utils/pointerDrag.ts'
import type { GooCheckboxProps } from './types.ts'

let checkboxElement: HTMLDivElement | undefined = $state()
let thumbElement: HTMLSpanElement | undefined = $state()
let trackElement: HTMLSpanElement | undefined = $state()

let {
	value = $bindable<boolean | undefined>(undefined),
	checked = $bindable<boolean | undefined>(undefined),
	label = '',
	name = '',
	formValue = 'on',
	disabled = false,
	ariaLabel,
	class: className = '',
	style,
	tabIndex = 0,
	children,
	onchange,
	...rest
}: GooCheckboxProps = $props()

let incomingChecked = $derived(Boolean(checked ?? value ?? false))
let currentChecked = $state(false)
let dragState = $state<{ startX: number; width: number; offset: number; moved: boolean } | null>(null)
let dragHandle: GooPointerDragHandle | null = null

$effect(() => {
	currentChecked = incomingChecked
})

$effect(() => {
	const element = checkboxElement
	if (!element || !thumbElement || !trackElement) return

	dragHandle?.detach()
	dragHandle = createPointerDrag(element, handlePointerDrag)
	return () => {
		dragHandle?.detach()
		dragHandle = null
	}
})

const classes = $derived.by(() => {
	const values = ['goo-checkbox']
	if (currentChecked) values.push('goo-checkbox--checked')
	if (disabled) values.push('goo-checkbox--disabled')
	if (dragState?.moved) values.push('goo-checkbox--dragging')
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
	const element = checkboxElement
	if (!element || apiElement === element) return
	apiElement = element
	untrack(() => Object.defineProperties(element, {
		checked: {
			configurable: true,
			get: () => currentChecked,
			set: value => setChecked(Boolean(value), { silent: true })
		},
		value: {
			configurable: true,
			get: () => currentChecked,
			set: value => setChecked(Boolean(value), { silent: true })
		},
		setValue: {
			configurable: true,
			value: (value: boolean, options: { silent?: boolean } = {}) => setChecked(value, options)
		},
		getValue: {
			configurable: true,
			value: () => currentChecked
		},
		toggle: {
			configurable: true,
			value: (value?: boolean) => toggle(value)
		}
	}))
})

function emitChange(oldValue: boolean): void {
	if (!checkboxElement) return
	onchange?.(currentChecked, oldValue)
	checkboxElement.dispatchEvent(new CustomEvent('change', {
		bubbles: true,
		detail: { value: currentChecked, checked: currentChecked, oldValue, target: checkboxElement }
	}))
}

function setChecked(nextValue: boolean, { silent = false }: { silent?: boolean } = {}): void {
	const oldValue = currentChecked
	currentChecked = Boolean(nextValue)
	if (oldValue !== currentChecked) {
		value = currentChecked
		checked = currentChecked
		if (!silent) {
			emitChange(oldValue)
		}
	}
}

function toggle(forcedValue?: boolean): boolean {
	if (disabled) return false
	const nextValue = forcedValue === undefined ? !currentChecked : forcedValue
	if (nextValue === currentChecked) return false
	setChecked(nextValue)
	return true
}

function handleClick(event: MouseEvent): void {
	if (dragState?.moved) return
	if (disabled) {
		event.preventDefault()
		event.stopImmediatePropagation()
		return
	}
	toggle()
}

function handleKeydown(event: KeyboardEvent): void {
	if (disabled) return
	switch (event.key) {
		case 'Enter':
			event.preventDefault()
			toggle()
			break
		case ' ':
			event.preventDefault()
			toggle()
			break
		case 'ArrowLeft':
			event.preventDefault()
			toggle(isRTL())
			break
		case 'ArrowRight':
			event.preventDefault()
			toggle(!isRTL())
			break
	}
}

function handlePointerDrag(event: GooPointerDragEvent): void {
	if (event.START) {
		startPointerDrag(event)
		return
	}
	if (event.CHANGE) {
		movePointerDrag(event)
		return
	}
	if (event.END) {
		finishPointerDrag()
	}
}

function startPointerDrag(event: GooPointerDragEvent): void {
	if (disabled || !thumbElement || !trackElement) return
	const thumbRect = thumbElement.getBoundingClientRect()
	const trackRect = trackElement.getBoundingClientRect()
	dragState = {
		startX: event.startClientX,
		width: trackRect.width - thumbRect.width,
		offset: currentChecked ? trackRect.width - thumbRect.width : 0,
		moved: false
	}
}

function movePointerDrag(event: GooPointerDragEvent): void {
	if (!dragState || !thumbElement) return
	const delta = event.clientX - dragState.startX
	dragState.moved ||= Math.abs(delta) > 5
	const left = clamp(dragState.offset + delta, 0, dragState.width)
	thumbElement.style.left = `${ left }px`
	const position = dragState.width > 0 ? left / dragState.width : 0
	if (currentChecked && position < 0.5) {
		setChecked(false)
	} else if (!currentChecked && position > 0.5) {
		setChecked(true)
	}
}

function finishPointerDrag(): void {
	if (!dragState || !thumbElement) return
	thumbElement.style.left = ''
	window.setTimeout(() => {
		dragState = null
	})
}
</script>

<div
	{...rest}
	bind:this={checkboxElement}
	class={classes}
	{style}
	role="switch"
	aria-checked={currentChecked}
	aria-disabled={disabled ? 'true' : undefined}
	aria-label={ariaLabel || (!children && label ? label : undefined)}
	{...hostAttributes}
	tabindex={disabled ? undefined : tabIndex}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<span bind:this={trackElement} class="goo-checkbox__track" aria-hidden="true"></span>
	<span bind:this={thumbElement} class="goo-checkbox__thumb" aria-hidden="true"></span>
	{#if name}
		<input class="goo-checkbox__input" type="hidden" {name} value={formValue} disabled={disabled || !currentChecked} />
	{/if}
	{#if children}
		<span class="goo-checkbox__label">
			{@render children()}
		</span>
	{:else if label}
		<span class="goo-checkbox__label">{label}</span>
	{/if}
</div>
