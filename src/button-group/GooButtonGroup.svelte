<script module lang="ts">
	import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

	/** GooController binding metadata for the Svelte button-group component. */
	export const controlSchema: SvelteControlSchema = {
		valueKey: 'value',
		changeKey: 'onchange',
		propMapping: {
			allowMultiple: 'allowMultiple',
			allowToggle: 'allowToggle',
			ariaLabel: 'label',
			className: 'class',
			layout: 'layout',
			options: 'options',
			size: 'size',
			tabIndex: 'tabIndex'
		}
	}
</script>

<script lang="ts">
	import '../button/GooButton.css'
	import './GooButtonGroup.css'

	import GooIcon from '../icon/GooIcon.svelte'
	import { iconRegistry } from '../icon/registry.ts'
	import { handleLinearNavigationKeyboardEvent } from '../support/keyboard/_composite.ts'
	import { handleKeyboardActivation } from '../support/keyboard/_keyboardActivation.ts'
	import { tooltip } from '../tooltip/tooltip.ts'
	import {
		normalizeButtonGroupOptions,
		normalizeButtonGroupValue,
		readButtonGroupValue
	} from './_model.ts'
	import type { GooButtonGroupProps, NormalizedButtonGroupOption } from './types.ts'

	let groupElement: HTMLDivElement | undefined = $state()
	let selectedIds = $state<Set<string>>(new Set())
	let focusedId = $state<string | null>(null)

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
		const values = ['goo-button-group']
		if (!allowMultiple && normalizedOptions.length > 0)
			values.push('goo-button-group--single-select')
		// Without this, the sliding indicator paints a phantom selection on the
		// first segment when nothing is selected yet.
		if (selectedIds.size === 0) values.push('goo-button-group--no-selection')
		if (disabled) values.push('goo-button-group--disabled')
		if (className) values.push(className)
		return values.filter(Boolean).join(' ')
	})

	const selectedIndex = $derived.by(() => {
		const index = normalizedOptions.findIndex((option) => selectedIds.has(option.id))
		return Math.max(0, index)
	})

	const rootStyle = $derived.by(() => {
		const declarations = [style].filter(Boolean) as string[]
		if (normalizedOptions.length > 0) {
			declarations.push(`--goo-button-group-option-count: ${normalizedOptions.length}`)
			declarations.push(`--goo-button-group-selected-index: ${selectedIndex}`)
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
		const nextSelectedIds = normalizeButtonGroupValue(value)
		selectedIds = nextSelectedIds
		focusedId = getPreferredFocusId(nextSelectedIds)
	})

	$effect(() => {
		normalizedOptions
		selectedIds
		disabled
		focusedId
		void Promise.resolve().then(syncChildButtons)
	})

	export function setValue(nextValue: string | string[] | null): void {
		selectedIds = normalizeButtonGroupValue(nextValue)
		focusedId = getPreferredFocusId(selectedIds)
		value = readButtonGroupValue(selectedIds, allowMultiple)
	}

	export function getValue(): string | string[] | null {
		return readButtonGroupValue(selectedIds, allowMultiple)
	}

	function handleGroupClick(event: MouseEvent): void {
		if (disabled) return

		const button = getEventButton(event)
		if (!button) return

		const id = readButtonId(button)
		selectId(id, { emit: true })
		button.focus()
	}

	function handleGroupKeydown(event: KeyboardEvent): void {
		if (disabled || !groupElement) return

		if (
			handleKeyboardActivation(event, () => {
				const button = getKeyboardButton(event)
				if (button) {
					selectId(readButtonId(button), { emit: true })
				}
			})
		) {
			return
		}

		handleLinearNavigationKeyboardEvent(event, groupElement, {
			activeItem: getFocusedButton(),
			itemSelector: ':scope > .goo-button',
			orientation: layout === 'vertical' ? 'vertical' : 'horizontal',
			activate: (item) => {
				const nextId = readButtonId(item as HTMLButtonElement)
				focusedId = nextId
				if (!allowMultiple) {
					selectId(nextId, { emit: true })
				}
			}
		})
	}

	function selectId(id: string, { emit }: { emit: boolean }): void {
		const nextSelected = new Set(selectedIds)
		const isSelected = nextSelected.has(id)
		if (isSelected && !allowToggle) return

		if (!allowMultiple) {
			nextSelected.clear()
		}

		if (isSelected) {
			nextSelected.delete(id)
		} else {
			nextSelected.add(id)
		}

		selectedIds = nextSelected
		focusedId = id
		value = readButtonGroupValue(nextSelected, allowMultiple)

		if (emit) {
			const idSelected = nextSelected.has(id)
			const nextValue = readButtonGroupValue(nextSelected, allowMultiple)
			onchange?.(nextValue)
			groupElement?.dispatchEvent(
				new CustomEvent('change', {
					bubbles: true,
					detail: { id, selected: idSelected, value: nextValue, target: groupElement }
				})
			)
		}
	}

	function isSelected(id: string): boolean {
		return selectedIds.has(id)
	}

	function getOptionButtonClass(option: NormalizedButtonGroupOption): string {
		const values = ['goo-button']
		if (isSelected(option.id)) values.push('goo-button--selected')
		if (focusedId === option.id) values.push('goo-button--focused')
		if (disabled || option.disabled) values.push('goo-button--disabled')
		if (option.hideLabel) values.push('goo-button--icon-only')
		if (option.className) values.push(...option.className.split(' ').filter(Boolean))
		return values.join(' ')
	}

	function getButtonTabIndex(id: string): number {
		const option = normalizedOptions.find((item) => item.id === id)
		if (option?.disabled) return -1
		if (disabled) return -1
		return focusedId === id ? tabIndex : -1
	}

	function getPreferredFocusId(nextSelected: Set<string>): string | null {
		const ids = getSelectableIds()
		return [...nextSelected].find((id) => ids.includes(id)) ?? ids[0] ?? null
	}

	function getSelectableIds(): string[] {
		if (normalizedOptions.length > 0) {
			return normalizedOptions.filter((option) => !option.disabled).map((option) => option.id)
		}

		return getChildButtons().map(readButtonId)
	}

	function syncChildButtons(): void {
		if (!groupElement || normalizedOptions.length > 0) return

		for (const button of getChildButtons()) {
			const id = readButtonId(button)
			button.dataset['id'] = id
			button.tabIndex = getButtonTabIndex(id)
			button.disabled = disabled
			button.setAttribute('aria-pressed', String(isSelected(id)))
			button.classList.toggle('goo-button--selected', isSelected(id))
			button.classList.toggle('goo-button--focused', focusedId === id)
			button.classList.toggle('goo-button--disabled', disabled)
		}
	}

	function getChildButtons(): HTMLButtonElement[] {
		return Array.from(
			groupElement?.querySelectorAll<HTMLButtonElement>(':scope > .goo-button') ?? []
		)
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
		if (
			active instanceof HTMLButtonElement &&
			active.parentElement === groupElement &&
			!active.disabled
		) {
			return active
		}
		if (!focusedId) {
			return null
		}
		return getChildButtons().find((button) => readButtonId(button) === focusedId) ?? null
	}

	function readButtonId(button: HTMLButtonElement): string {
		const id = button.dataset['id']
		if (!id) {
			throw new TypeError('GooButtonGroup child buttons must define a non-empty data-id.')
		}
		return id
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
	onkeydowncapture={handleGroupKeydown}
>
	{#if normalizedOptions.length > 0}
		{#each normalizedOptions as option (option.id)}
			<button
				type="button"
				class={getOptionButtonClass(option)}
				data-id={option.id}
				tabindex={getButtonTabIndex(option.id)}
				disabled={disabled || option.disabled ? true : undefined}
				aria-disabled={disabled || option.disabled ? 'true' : undefined}
				aria-label={option.ariaLabel || option.title || option.label || undefined}
				aria-pressed={isSelected(option.id)}
				use:tooltip={{ content: option.title || option.label }}
			>
				{#if typeof option.icon === 'string'}
					{#if iconRegistry.has(option.icon)}
						<GooIcon value={option.icon} class="goo-button__icon" />
					{:else}
						<span class={`goo-button__icon ${option.icon}`} aria-hidden="true"></span>
					{/if}
				{:else if typeof option.icon === 'function'}
					<span class="goo-button__icon" aria-hidden="true" use:mountIcon={option.icon}></span>
				{/if}
				{#if !option.hideLabel}
					<span class="goo-button__title" data-translate>{option.label}</span>
				{/if}
			</button>
		{/each}
	{:else if children}
		{@render children()}
	{/if}
</div>
