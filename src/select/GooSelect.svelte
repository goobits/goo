<script module lang="ts">
import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

/** GooController binding metadata for the Svelte select component. */
export const controlSchema: SvelteControlSchema = {
	propMapping: {
		menu: 'menu',
		name: 'name',
		options: 'options',
		placeholder: 'placeholder'
	}
}
</script>

<script lang="ts">
import './GooSelect.css'
import './GooSelect.submenu.css'

import { createGooPopout } from '../popout/index.ts'
import type { GooPopoutInstance } from '../popout/index.ts'
import { DropdownPanel } from './_dropdownPanel.ts'
import {
	handleKeyboard,
	handleTypeahead,
	mapNativeKeyToCommand,
	type GooSelectKeyboardHost
} from './_keyboardHandler.ts'
import { normalizeOptions } from './_normalizeOptions.ts'
import {
	applySelectMenuWidth,
	getSelectMenuAlign,
	getSelectMenuOffset,
	getSelectMenuPopoutClass,
	normalizeSelectMenu
} from './_selectMenu.ts'
import { evaluate, getElementTextDirection } from './selectDom.ts'
import type {
	GooSelectElement,
	GooSelectEventData,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectOptionsInput,
	GooSelectProps,
	GooSelectState
} from './types.ts'

type SelectPopout = GooPopoutInstance

let selectRoot: HTMLDivElement | undefined = $state()
// The root <div> is augmented with the GooSelect API at runtime (assignSelectApi),
// so expose it under the augmented type while binding to the real element type.
const selectElement = $derived(selectRoot as GooSelectElement | undefined)
let triggerElement: HTMLButtonElement | undefined = $state()
let panel = $state<DropdownPanel | null>(null)
let popout = $state<SelectPopout | null>(null)
let normalizedOptions: GooSelectOption[] = $state([])
let selectedValue = $state('')
let effectiveDisabled = $state(false)
let currentTriggerIcon = $state<string | HTMLElement | (() => HTMLElement) | undefined>()
let currentBoundContext = $state<unknown>()
let listboxId = $state('')
let activeDescendant = $state('')
let triggerPointerId: number | null = null

let {
	options = [],
	value = $bindable(''),
	name = '',
	enableKeyboard = true,
	showSelectionIndicator = true,
	showHeader = true,
	menu,
	placeholder = 'Select...',
	ariaLabel,
	'aria-label': ariaLabelAttribute,
	tooltip,
	title,
	disabled = false,
	actionContext,
	triggerIcon,
	id,
	size,
	class: className = '',
	style,
	children,
	element = $bindable<GooSelectElement | null>(null),
	onchange,
	onopen,
	onclose,
	...rest
}: GooSelectProps = $props()

const opened = $derived(Boolean(popout?.isOpen()))
const selectedOption = $derived(findOptionById(normalizedOptions, selectedValue))
const selectMenu = $derived(normalizeSelectMenu(menu))
const triggerLabel = $derived(getOptionLabel(selectedOption) || placeholder)
const triggerAccessibleName = $derived(readTriggerAccessibleName())
const showPlaceholder = $derived(!selectedOption)
// Named `selectState` (not `state`) so the `$state` rune token is not parsed as
// Svelte store-style access to a `state` variable by svelte-check.
const selectState = $derived<GooSelectState>({
	value: selectedValue,
	placeholder,
	enableKeyboard,
	showSelectionIndicator,
	showHeader,
	disabled: effectiveDisabled
})

const classes = $derived.by(() => {
	const values = [ 'goo-select' ]
	if (opened) values.push('goo-select--open')
	if (selectMenu.variant === 'attached') values.push('goo-select--menu-attached')
	if (effectiveDisabled) values.push('goo-select--disabled')
	if (className) values.push(className)
	return values.filter(Boolean).join(' ')
})

// Custom host attributes (CSS / external-query hooks) spread so svelte-check
// does not reject them as unknown attributes on a <div>.
const hostAttributes = $derived<Record<string, string | undefined>>({
	size,
	placeholder,
	disabled: effectiveDisabled ? '' : undefined,
	'show-header': showHeader ? undefined : 'false',
	'enable-keyboard': enableKeyboard ? undefined : 'false',
	'show-selection-indicator': showSelectionIndicator ? undefined : 'false'
})

$effect(() => {
	normalizedOptions = normalizeOptions(options)
})

$effect(() => {
	selectedValue = value ?? ''
})

$effect(() => {
	effectiveDisabled = Boolean(disabled)
})

$effect(() => {
	currentTriggerIcon = triggerIcon
})

$effect(() => {
	currentBoundContext = actionContext
})

$effect(() => {
	if (!selectElement) {
		element = null
		return
	}

	assignSelectApi(selectElement as GooSelectRuntimeElement)
	selectElement.setAttribute('value', selectedValue)
	element = selectElement
})

$effect(() => () => {
	stopTriggerPointerSelection()
	panel?.destroy()
	popout?.destroy()
})

export function setValue(nextValue: string, { silent = true }: { silent?: boolean } = {}): void {
	const oldValue = selectedValue
	if (Object.is(oldValue, nextValue)) return

	selectedValue = nextValue
	value = selectedValue
	panel?.updateContext({ value: selectedValue })
	if (opened) {
		panel?.render(normalizedOptions)
		panel?.setHovered(selectedValue)
	}
	if (!silent && oldValue !== selectedValue) {
		emitChange(oldValue)
	}
}

export function getValue(): string {
	return selectedValue
}

export function setOptions(nextOptions: GooSelectOptionsInput): void {
	normalizedOptions = normalizeOptions(nextOptions)
	if (opened) panel?.render(normalizedOptions)
}

export function setTriggerIcon(icon: string | HTMLElement | (() => HTMLElement) | null): void {
	currentTriggerIcon = icon ?? undefined
}

export function open(options: GooSelectOpenOptions = {}): boolean {
	if (!selectElement || opened || effectiveDisabled) return false

	const {
		autoFocus = true,
		at,
		clickToClose = true,
		keepWithin,
		parentElement,
		actionContext: contextOverride,
		align: alignOverride,
		offset: offsetOverride
	} = options
	if (contextOverride) {
		currentBoundContext = contextOverride
	}

	if (!panel) {
		panel = new DropdownPanel({
			showSelectionIndicator,
			value: selectedValue,
			getContext: () => getContext(),
			onSelect: (option, item) => selectOption(option, item),
			onHoverChange: (hoveredId, activeDescendantId) => {
				activeDescendant = activeDescendantId
				selectElement?.dispatchEvent(new CustomEvent('hoverchange', { bubbles: true, detail: { id: hoveredId } }))
			}
		})
		panel.$container.addEventListener('keydown', event => {
			const command = mapNativeKeyToCommand(event)
			if (command && selectElement) handleKeyboard(selectElement as unknown as GooSelectKeyboardHost, command)
		})
	} else {
		panel.updateContext({
			showSelectionIndicator,
			value: selectedValue
		})
	}

	panel.render(normalizedOptions)
	listboxId = panel.listboxId
	syncPanelTypography()

	const currentMenu = selectMenu
	const positionAt = at || (showHeader ? triggerElement : selectElement)
	const triggerWidth = positionAt instanceof HTMLElement
		? Math.max(1, Math.round(positionAt.getBoundingClientRect().width))
		: undefined
	const textDirection = getElementTextDirection(selectElement)
	applySelectMenuWidth(panel.$container, currentMenu, triggerWidth)

	popout = createGooPopout({
		content: panel.$container,
		parentElement: parentElement || document.body,
		role: null,
		className: getSelectMenuPopoutClass(currentMenu),
		clickToClose,
		escapeToClose: true,
		keepWithin: keepWithin || { element: document.body, margin: 15 },
		showArrow: currentMenu.arrow,
		showBackdrop: currentMenu.backdrop,
		at: positionAt,
		align: alignOverride ?? getSelectMenuAlign(currentMenu),
		offset: offsetOverride ?? getSelectMenuOffset(currentMenu),
		rtl: textDirection === 'rtl',
		attributes: { dir: textDirection },
		onClose: () => close({ fromPopout: true }),
		onOpen: () => {
			if (!autoFocus) return
			requestAnimationFrame(() => {
				if (!panel) return
				const toFocus = selectedValue || panel.getNavigableOptions()[0]?.dataset.id
				if (toFocus) panel.setHovered(toFocus)
			})
		}
	})

	selectElement.dispatchEvent(new CustomEvent('open', { bubbles: true }))
	onopen?.()
	return true
}

function syncPanelTypography(): void {
	if (!selectElement || !panel) return

	const style = getComputedStyle(selectElement)
	panel.$container.style.setProperty(
		'--goo-select-font-size',
		style.getPropertyValue('--goo-select-font-size').trim() || style.fontSize
	)
}

export function close({ quiet = false, fromPopout = false }: { quiet?: boolean; fromPopout?: boolean } = {}): void {
	if (!selectElement || !opened) return

	stopTriggerPointerSelection()
	panel?.closeSubmenu()
	panel?.resetTypeahead()
	if (panel) panel.hoveredId = null
	activeDescendant = ''
	listboxId = ''

	if (!fromPopout && popout?.isOpen()) {
		popout.destroy()
	}
	popout = null

	if (!quiet) {
		selectElement.dispatchEvent(new CustomEvent('close', { bubbles: true }))
		onclose?.()
	}
}

export function toggle(): void {
	if (opened) {
		close()
	} else {
		open()
	}
}

export function enable(): void {
	effectiveDisabled = false
}

export function disable(): void {
	effectiveDisabled = true
	close()
}

export function focus(): void {
	triggerElement?.focus()
}

export function blur(): void {
	triggerElement?.blur()
}

type GooSelectRuntimeElement = GooSelectElement & GooSelectKeyboardHost

function assignSelectApi(select: GooSelectRuntimeElement): void {
	Object.defineProperties(select, {
		state: {
			configurable: true,
			get: () => selectState
		},
		_selectOptions: {
			configurable: true,
			get: () => normalizedOptions
		},
		_panel: {
			configurable: true,
			get: () => panel
		},
		_opened: {
			configurable: true,
			get: () => opened,
			set: value => {
				if (!value) popout = null
			}
		},
		$trigger: {
			configurable: true,
			get: () => triggerElement ?? null
		},
		value: {
			configurable: true,
			get: () => selectedValue,
			set: nextValue => setValue(String(nextValue), { silent: true })
		}
	})

	select._getContext = () => getContext()
	select._selectOption = option => selectOption(option)
	select.open = (options?: GooSelectOpenOptions) => open(options)
	select.close = (options?: { quiet?: boolean }) => close(options)
	select.toggle = () => toggle()
	select.setValue = (nextValue, { silent = false } = {}) => setValue(nextValue, { silent })
	select.getValue = () => getValue()
	select.isOpen = () => opened
	select.getHoveredOptionId = () => panel?.hoveredId ?? null
	select.getOptions = () => normalizedOptions
	select.setOptions = nextOptions => setOptions(nextOptions)
	select.setTriggerIcon = icon => setTriggerIcon(icon)
	select.enable = () => enable()
	select.disable = () => disable()
	select.focus = () => focus()
	select.blur = () => blur()
}

function handleTriggerPointerDown(event: PointerEvent): void {
	if (effectiveDisabled || event.button !== 0) return
	event.preventDefault()

	if (opened) {
		close()
		return
	}

	if (open({ autoFocus: false })) {
		startTriggerPointerSelection(event.pointerId)
	}
}

function startTriggerPointerSelection(pointerId: number): void {
	stopTriggerPointerSelection()
	triggerPointerId = pointerId
	document.addEventListener('pointermove', handleTriggerPointerMove, true)
	document.addEventListener('pointerup', handleTriggerPointerUp, true)
	document.addEventListener('pointercancel', handleTriggerPointerCancel, true)
}

function stopTriggerPointerSelection(): void {
	if (triggerPointerId === null) return

	triggerPointerId = null
	document.removeEventListener('pointermove', handleTriggerPointerMove, true)
	document.removeEventListener('pointerup', handleTriggerPointerUp, true)
	document.removeEventListener('pointercancel', handleTriggerPointerCancel, true)
}

function handleTriggerPointerMove(event: PointerEvent): void {
	if (event.pointerId !== triggerPointerId || !panel) return

	const item = panel.getOptionElementAtPoint(event.clientX, event.clientY)
	if (item) panel.hoverOptionElement(item)
}

function handleTriggerPointerUp(event: PointerEvent): void {
	if (event.pointerId !== triggerPointerId) return

	const item = panel?.getOptionElementAtPoint(event.clientX, event.clientY)
	const didSelect = item ? panel?.selectOptionElement(item) === true : false
	stopTriggerPointerSelection()

	if (didSelect) {
		event.preventDefault()
		event.stopPropagation()
	}
}

function handleTriggerPointerCancel(event: PointerEvent): void {
	if (event.pointerId === triggerPointerId) stopTriggerPointerSelection()
}

function handleKeydown(event: KeyboardEvent): void {
	if (!enableKeyboard || effectiveDisabled || !selectElement) return

	const command = mapNativeKeyToCommand(event)
	if (command) {
		handleKeyboard(selectElement as unknown as GooSelectKeyboardHost, command)
	} else if (event.key.length === 1) {
		handleTypeahead(selectElement as unknown as GooSelectKeyboardHost, {
			command: event.key,
			cancel: () => event.preventDefault()
		})
	}
}

function selectOption(option: GooSelectOption, item?: HTMLElement | null): void {
	if (selectedValue === option.id && showSelectionIndicator) {
		close({ quiet: true })
		return
	}

	const oldValue = selectedValue
	selectedValue = option.id ?? ''
	value = selectedValue
	if (showSelectionIndicator) {
		panel?.setSelectedVisual(selectedValue)
	}

	const optionElement = item ?? panel?.getOptionElementById(selectedValue)
	if (optionElement && panel) {
		panel.animateSelection(optionElement).then(() => finishSelection(option, oldValue))
	} else {
		finishSelection(option, oldValue)
	}
}

function finishSelection(option: GooSelectOption, oldValue: string): void {
	option.onChoose?.call(getContext(), option.id ?? '')
	close({ quiet: true })
	if (oldValue !== option.id) {
		emitChange(oldValue)
	}
}

function emitChange(oldValue: string): void {
	if (!selectElement) return

	const data: GooSelectEventData = {
		select: selectElement,
		value: selectedValue,
		oldValue
	}
	onchange?.(selectedValue, data)
	selectElement.dispatchEvent(new CustomEvent('change', { detail: data, bubbles: true }))
}

function getContext(): unknown {
	return currentBoundContext || selectElement
}

function findOptionById(options: GooSelectOption[], optionId: string): GooSelectOption | null {
	for (const option of options) {
		if (option.id === optionId) return option
		if (option.options) {
			const found = findOptionById(option.options, optionId)
			if (found) return found
		}
	}
	return null
}

function getOptionLabel(option: GooSelectOption | null): string {
	if (!option) return ''
	const label = evaluate(option.label, getContext())
	if (label instanceof HTMLElement) return label.textContent ?? ''
	return String(label ?? option.id ?? '')
}

function readTriggerAccessibleName(): string {
	return textValue(ariaLabel)
		|| textValue(ariaLabelAttribute)
		|| textValue(title)
		|| (typeof tooltip === 'string' ? textValue(tooltip) : '')
		|| textValue(triggerLabel)
		|| textValue(placeholder)
		|| 'Select'
}

function textValue(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

function getTriggerIconClasses(icon: unknown): string {
	if (typeof icon !== 'string') return ''
	const trimmed = icon.trim()
	if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('http') || trimmed.startsWith('./') || trimmed.startsWith('/') || trimmed.startsWith('data:')) return ''
	return trimmed
}

</script>

<div
	{...rest}
	bind:this={selectRoot}
	{id}
	class={classes}
	{style}
	{...hostAttributes}
	aria-disabled={effectiveDisabled ? 'true' : undefined}
	onkeydown={handleKeydown}
>
	{#if showHeader}
		<button
			bind:this={triggerElement}
			type="button"
			class="goo-select__trigger"
			role="combobox"
			aria-haspopup="listbox"
			aria-expanded={opened ? 'true' : 'false'}
			aria-controls={opened && listboxId ? listboxId : undefined}
			aria-activedescendant={opened && activeDescendant ? activeDescendant : undefined}
			aria-label={triggerAccessibleName}
			disabled={effectiveDisabled}
			title={typeof tooltip === 'string' ? tooltip : title}
			onpointerdown={handleTriggerPointerDown}
		>
			{#if getTriggerIconClasses(currentTriggerIcon)}
				<span class={`goo-select__trigger-icon ${ getTriggerIconClasses(currentTriggerIcon) }`}></span>
			{/if}
			<span
				class="goo-select__trigger-label"
				class:goo-select__trigger-label--placeholder={showPlaceholder}
			>{triggerLabel}</span>
			<span class="goo-select__trigger-arrow">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="m9 18 6-6-6-6"></path>
				</svg>
			</span>
		</button>
	{/if}
	{#if name}
		<input type="hidden" data-goo-select-field {name} value={selectedValue} disabled={effectiveDisabled} />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
