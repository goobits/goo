<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte button-group component. */
export const controlSchema: SvelteControlSchema = {
	valueKey: 'value',
	changeKey: 'onchange',
	propMapping: {
		allowMultiple: 'allowMultiple',
		allowToggle: 'allowToggle',
		layout: 'layout',
		options: 'options',
		size: 'size'
	}
}
</script>

<script lang="ts">
import '../button/GooButton.css'
import './GooButtonGroup.css'

import { handleLinearNavigationKeyboardEvent } from '@goobits/keyboard/composite'
import {
	normalizeButtonGroupOptions,
	normalizeButtonGroupValue,
	readButtonGroupValue
} from './_model.ts'
import {
	handleKeyboardActivation
} from '../support/keyboard/_keyboardActivation.ts'
import type { GooButtonGroupProps, NormalizedButtonGroupOption } from './types.ts'

let groupElement: HTMLDivElement | undefined = $state()
let selectedKeys = $state<Set<string>>(new Set())
let focusedKey = $state<string | null>(null)

let {
	options,
	value = $bindable<string | string[] | null | undefined>(undefined),
	allowMultiple = false,
	allowToggle: allowToggleProp,
	layout = 'horizontal',
	disabled = false,
	size,
	label,
	class: className = '',
	style,
	tabIndex = 0,
	children,
	onchange,
	...rest
}: GooButtonGroupProps = $props()

const allowToggle = $derived(allowToggleProp ?? allowMultiple)
const normalizedOptions = $derived(normalizeButtonGroupOptions(options))

const classes = $derived.by(() => {
	const values = [ 'goo-button-group' ]
	if (!allowMultiple && normalizedOptions.length > 0) values.push('goo-button-group--single-select')
	if (disabled) values.push('goo-button-group--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

const selectedIndex = $derived.by(() => {
	const index = normalizedOptions.findIndex(option => selectedKeys.has(option.key))
	return Math.max(0, index)
})

const rootStyle = $derived.by(() => {
	const declarations = [ style ].filter(Boolean) as string[]
	if (normalizedOptions.length > 0) {
		declarations.push(`--goo-button-group-option-count: ${ normalizedOptions.length }`)
		declarations.push(`--goo-button-group-selected-index: ${ selectedIndex }`)
	}
	return declarations.join('; ')
})

// Custom host attributes (CSS / external-query hooks) spread so svelte-check
// does not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | undefined>>({
	'allow-multiple': allowMultiple ? 'true' : undefined,
	'allow-toggle': allowToggle ? 'true' : undefined,
	disabled: disabled ? '' : undefined,
	size
})

$effect(() => {
	const nextSelectedKeys = normalizeButtonGroupValue(value)
	selectedKeys = nextSelectedKeys
	focusedKey = getPreferredFocusKey(nextSelectedKeys)
})

$effect(() => {
	normalizedOptions
	selectedKeys
	disabled
	focusedKey
	void Promise.resolve().then(syncChildButtons)
})

export function setValue(nextValue: string | string[] | null): void {
	selectedKeys = normalizeButtonGroupValue(nextValue)
	focusedKey = getPreferredFocusKey(selectedKeys)
	value = readButtonGroupValue(selectedKeys, allowMultiple)
}

export function getValue(): string | string[] | null {
	return readButtonGroupValue(selectedKeys, allowMultiple)
}

function handleGroupClick(event: MouseEvent): void {
	if (disabled) return

	const button = getEventButton(event)
	if (!button) return

	const key = readButtonKey(button)
	selectKey(key, { emit: true })
	button.focus()
}

function handleGroupKeydown(event: KeyboardEvent): void {
	if (disabled || !groupElement) return

	if (handleKeyboardActivation(event, () => {
		const button = getKeyboardButton(event)
		if (button) {
			selectKey(readButtonKey(button), { emit: true })
		}
	})) {
		return
	}

	handleLinearNavigationKeyboardEvent(event, groupElement, {
		activeItem: getFocusedButton(),
		itemSelector: ':scope > .goo-button',
		orientation: layout === 'vertical' ? 'vertical' : 'horizontal',
		activate: item => {
			const nextKey = readButtonKey(item as HTMLButtonElement)
			focusedKey = nextKey
			if (!allowMultiple) {
				selectKey(nextKey, { emit: true })
			}
		}
	})
}

function selectKey(key: string, { emit }: { emit: boolean }): void {
	const nextSelected = new Set(selectedKeys)
	const isSelected = nextSelected.has(key)
	if (isSelected && !allowToggle) return

	if (!allowMultiple) {
		nextSelected.clear()
	}

	if (isSelected) {
		nextSelected.delete(key)
	} else {
		nextSelected.add(key)
	}

	selectedKeys = nextSelected
	focusedKey = key
	value = readButtonGroupValue(nextSelected, allowMultiple)

	if (emit) {
		const keySelected = nextSelected.has(key)
		const nextValue = readButtonGroupValue(nextSelected, allowMultiple)
		onchange?.(nextValue)
		groupElement?.dispatchEvent(new CustomEvent('change', {
			bubbles: true,
			detail: { key, selected: keySelected, value: nextValue, target: groupElement }
		}))
	}
}

function isSelected(key: string): boolean {
	return selectedKeys.has(key)
}

function getOptionButtonClass(option: NormalizedButtonGroupOption): string {
	const values = [ 'goo-button' ]
	if (isSelected(option.key)) values.push('goo-button--selected')
	if (focusedKey === option.key) values.push('goo-button--focused')
	if (disabled) values.push('goo-button--disabled')
	if (option.hideLabel) values.push('goo-button--icon-only')
	if (option.className) values.push(...option.className.split(' ').filter(Boolean))
	return values.join(' ')
}

function getButtonTabIndex(key: string): number {
	if (disabled) return -1
	return focusedKey === key ? tabIndex : -1
}

function getPreferredFocusKey(nextSelected: Set<string>): string | null {
	const keys = getSelectableKeys()
	return [ ...nextSelected ].find(key => keys.includes(key)) ?? keys[0] ?? null
}

function getSelectableKeys(): string[] {
	if (normalizedOptions.length > 0) {
		return normalizedOptions.map(option => option.key)
	}

	return getChildButtons().map(readButtonKey)
}

function syncChildButtons(): void {
	if (!groupElement || normalizedOptions.length > 0) return

	for (const button of getChildButtons()) {
		const key = readButtonKey(button)
		button.dataset.key = key
		button.tabIndex = getButtonTabIndex(key)
		button.disabled = disabled
		button.setAttribute('aria-pressed', String(isSelected(key)))
		button.classList.toggle('goo-button--selected', isSelected(key))
		button.classList.toggle('goo-button--focused', focusedKey === key)
		button.classList.toggle('goo-button--disabled', disabled)
	}
}

function getChildButtons(): HTMLButtonElement[] {
	return Array.from(groupElement?.querySelectorAll<HTMLButtonElement>(':scope > .goo-button') ?? [])
}

function getEventButton(event: MouseEvent): HTMLButtonElement | null {
	const target = event.target
	if (!(target instanceof Element)) return null

	const button = target.closest<HTMLButtonElement>('.goo-button')
	if (!button || button.parentElement !== groupElement || button.disabled) return null
	return button
}

function getKeyboardButton(event: KeyboardEvent): HTMLButtonElement | null {
	const target = event.target instanceof Element ? event.target : null
	const button = target?.closest<HTMLButtonElement>('.goo-button')
	if (button && button.parentElement === groupElement && !button.disabled) {
		return button
	}
	return getFocusedButton()
}

function getFocusedButton(): HTMLButtonElement | null {
	const active = document.activeElement
	if (active instanceof HTMLButtonElement && active.parentElement === groupElement && !active.disabled) {
		return active
	}
	if (!focusedKey) {
		return null
	}
	return getChildButtons().find(button => readButtonKey(button) === focusedKey) ?? null
}

function readButtonKey(button: HTMLButtonElement): string {
	return button.dataset.key || button.dataset.value || button.textContent?.trim() || ''
}

function mountIcon(node: HTMLSpanElement, iconFactory: () => Element) {
	let iconElement: Element | null = null

	function update(factory: () => Element): void {
		iconElement?.remove()
		iconElement = factory()
		if (iconElement) {
			node.appendChild(iconElement)
		}
	}

	update(iconFactory)

	return {
		update,
		destroy() {
			iconElement?.remove()
		}
	}
}
</script>

<div
	{...rest}
	bind:this={groupElement}
	class={classes}
	role="group"
	aria-label={label || undefined}
	data-layout={layout === 'vertical' ? 'vertical' : undefined}
	{...hostAttributes}
	aria-disabled={disabled ? 'true' : undefined}
	style={rootStyle || undefined}
	onclick={handleGroupClick}
	onkeydown={handleGroupKeydown}
>
	{#if normalizedOptions.length > 0}
		{#each normalizedOptions as option (option.key)}
			<button
				type="button"
				class={getOptionButtonClass(option)}
				data-key={option.key}
				tabindex={getButtonTabIndex(option.key)}
				disabled={disabled ? true : undefined}
				aria-disabled={disabled ? 'true' : undefined}
				aria-label={option.ariaLabel || option.tooltip || option.value || undefined}
				aria-pressed={isSelected(option.key)}
				title={option.tooltip || undefined}
			>
				{#if typeof option.icon === 'string'}
					<span class={`goo-button__icon ${ option.icon }`} aria-hidden="true"></span>
				{:else if typeof option.icon === 'function'}
					<span class="goo-button__icon" aria-hidden="true" use:mountIcon={option.icon}></span>
				{/if}
				{#if !option.hideLabel}
					<span class="goo-button__title" data-translate>{option.value}</span>
				{/if}
			</button>
		{/each}
	{:else if children}
		{@render children()}
	{/if}
</div>
