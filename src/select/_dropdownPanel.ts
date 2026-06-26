/**
 * @fileoverview DropdownPanel - Manages rendering and visual state of dropdown options.
 * @module goobits/select/DropdownPanel
 */

import { findOptionById } from './_normalizeOptions.ts'
import { SubmenuPopoutController } from './_submenuPopout.ts'
import { createIcon, createShortcut, evaluate } from './selectDom.ts'
import type { GooSelectOption } from './types.ts'

// ============================================================================
// Constants
// ============================================================================

const SUBMENU_DELAY = 250
const TYPEAHEAD_TIMEOUT = 750

/** Monotonic counter giving each panel instance a unique id namespace for ARIA wiring. */
let panelInstanceCount = 0

// ============================================================================
// Types
// ============================================================================

type OptionElement = HTMLElement

/**
 * Context provided by GooSelect to the panel.
 */
export interface DropdownPanelContext {
	/** Whether to show current-value checkmarks. */
	showSelectionIndicator: boolean

	/** Current option ID */
	value: string

	/** Get bound context for callbacks */
	getContext: () => unknown

	/** Called when an option is selected */
	onSelect: (opt: GooSelectOption, $item: HTMLElement | null) => void

	/**
	 * Called when hover changes.
	 * @param id - The option's logical id (its `data-id`).
	 * @param activeDescendantId - The DOM element id of the active option, or empty when none is active.
	 */
	onHoverChange: (id: string, activeDescendantId: string) => void
}

// ============================================================================
// DropdownPanel
// ============================================================================

/**
 * Manages the dropdown panel: option rendering, hover state, selection visuals, and submenus.
 */
export class DropdownPanel {
	$container: HTMLElement

	/** Stable DOM id of the listbox container, for the trigger's `aria-controls`. */
	readonly listboxId: string

	hoveredId: string | null = null

	#ctx: DropdownPanelContext
	#options: GooSelectOption[] = []
	#instanceId = `goo-select-${ ++panelInstanceCount }`
	#optionSeq = 0
	#submenuTimer: ReturnType<typeof setTimeout> | null = null
	#submenuPopout: SubmenuPopoutController
	#typeaheadBuffer = ''
	#typeaheadTimer: ReturnType<typeof setTimeout> | null = null
	#selectionAnimationCleanup: (() => void) | null = null
	#selectionAnimationToken = 0
	#handleContainerMouseEnter = () => this.#cancelSubmenuTimer()
	#handleContainerMouseLeave = (event: MouseEvent) =>
		this.#scheduleSubmenuClose(event.relatedTarget)

	constructor(ctx: DropdownPanelContext) {
		this.#ctx = ctx
		this.listboxId = `${ this.#instanceId }-listbox`
		this.$container = document.createElement('div')
		this.$container.className = 'goo-select__options'
		this.$container.id = this.listboxId
		this.$container.setAttribute('role', 'listbox')
		this.$container.setAttribute('tabindex', '-1')
		this.#submenuPopout = new SubmenuPopoutController(
			(options, container) => this.#renderOptionsList(options, container),
			{
				onMouseEnter: () => this.#cancelSubmenuTimer(),
				onMouseLeave: event => this.#scheduleSubmenuClose(event.relatedTarget)
			}
		)
		this.$container.addEventListener('mouseenter', this.#handleContainerMouseEnter)
		this.$container.addEventListener('mouseleave', this.#handleContainerMouseLeave)
	}

	// --------------------------------------------------------------------------
	// Public API
	// --------------------------------------------------------------------------

	/**
	 * Update context (e.g., when selected value changes).
	 * @param ctx - ctx.
	 */
	updateContext(ctx: Partial<DropdownPanelContext>) {
		Object.assign(this.#ctx, ctx)
	}

	/**
	 * Render options to the container.
	 * @param options - options.
	 */
	render(options: GooSelectOption[]) {
		this.#options = options
		this.#optionSeq = 0
		this.$container.removeAttribute('aria-activedescendant')
		this.$container.innerHTML = ''
		this.#renderOptionsList(options, this.$container)
	}

	/**
	 * Get all navigable (non-disabled) option elements.
	 */
	getNavigableOptions(): OptionElement[] {
		return Array.from(
			this.$container.querySelectorAll<HTMLElement>(
				'.goo-select__option:not(.goo-select__option--disabled)'
			)
		)
	}

	/**
	 * Set the hovered option by ID.
	 * @param id - id.
	 */
	setHovered(id: string) {
		// Remove previous hover
		const $prev = this.$container.querySelector('.goo-select__option--hovered')
		if ($prev) $prev.classList.remove('goo-select__option--hovered')

		this.hoveredId = id

		// Add new hover
		const $item = this.getOptionElementById(id)
		if ($item) {
			$item.classList.add('goo-select__option--hovered')
			$item.scrollIntoView({ block: 'nearest' })
			this.$container.setAttribute('aria-activedescendant', $item.id)
		} else {
			this.$container.removeAttribute('aria-activedescendant')
		}

		this.#ctx.onHoverChange(id, $item?.id ?? '')
	}

	/**
	 * Clear the active hover state.
	 */
	clearHovered(): void {
		const $prev = this.$container.querySelector('.goo-select__option--hovered')
		if ($prev) $prev.classList.remove('goo-select__option--hovered')
		this.hoveredId = null
		this.$container.removeAttribute('aria-activedescendant')
		this.#ctx.onHoverChange('', '')
	}

	/**
	 * Navigate to next/previous option.
	 * @param dir - 1 for next, -1 for previous
	 */
	navigate(dir: 1 | -1) {
		const items = this.getNavigableOptions()
		if (!items.length) return

		const currentIdx = items.findIndex(el => el.dataset.id === this.hoveredId)
		let nextIdx = currentIdx + dir

		if (nextIdx < 0) nextIdx = items.length - 1
		if (nextIdx >= items.length) nextIdx = 0

		this.setHovered(items[nextIdx].dataset.id!)
	}

	/**
	 * Update selection visual (checkmark) to a new option.
	 * @param id - id.
	 */
	setSelectedVisual(id: string) {
		// Remove previous selection visual
		const $prev = this.$container.querySelector('.goo-select__option--selected')
		if ($prev) {
			$prev.classList.remove('goo-select__option--selected')
			$prev.setAttribute('aria-selected', 'false')
			const $check = $prev.querySelector('.goo-select__check')
			if ($check) $check.innerHTML = ''
		}

		// Add selection visual to new option
		const $item = this.getOptionElementById(id)
		if ($item) {
			$item.classList.add('goo-select__option--selected')
			$item.setAttribute('aria-selected', 'true')
			const $check = $item.querySelector('.goo-select__check')
			if ($check) {
				$check.innerHTML =
					'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>'
			}
		}
	}

	/**
	 * Animate option selection with flash effect.
	 * @returns Promise that resolves when animation completes
	 * @param $item - item.
	 */
	animateSelection($item: HTMLElement): Promise<void> {
		this.#cancelSelectionAnimation()
		return new Promise<void>(resolve => {
			const duration = 60 // ms per step
			const token = ++this.#selectionAnimationToken
			const timers: Array<ReturnType<typeof setTimeout>> = []
			let settled = false

			// Mark as animating
			$item.dataset.isChosen = 'true'
			this.$container.dataset.isChoosingOption = 'true'

			let step = 0
			const totalSteps = 3
			const cleanup = () => {
				for (const timer of timers) clearTimeout(timer)
				timers.length = 0
				$item.classList.remove('goo-select__option--flash')
				$item.dataset.isChosen = ''
				this.$container.dataset.isChoosingOption = ''
				if (this.#selectionAnimationCleanup === cleanup) {
					this.#selectionAnimationCleanup = null
				}
			}
			this.#selectionAnimationCleanup = cleanup

			const nextStep = () => {
				if (token !== this.#selectionAnimationToken) return
				const isHighlighted = step % 2 === 0

				if (isHighlighted) {
					$item.classList.add('goo-select__option--flash')
				} else {
					$item.classList.remove('goo-select__option--flash')
				}

				step++
				if (step <= totalSteps) {
					timers.push(setTimeout(nextStep, duration))
				} else {
					// Cleanup
					settled = true
					cleanup()
					resolve()
				}
			}

			const cancel = cleanup
			this.#selectionAnimationCleanup = () => {
				if (settled) return
				++this.#selectionAnimationToken
				cancel()
			}
			nextStep()
		})
	}

	/**
	 * Open a submenu for an option.
	 * @param opt - opt.
	 * @param $item - item.
	 */
	openSubmenu($item: HTMLElement, opt: GooSelectOption) {
		this.#submenuPopout.open($item, opt)
	}

	/**
	 * Close active submenu.
	 */
	closeSubmenu() {
		this.#submenuPopout.close()
	}

	/**
	 * Find option by ID in the options tree.
	 * @param id - id.
	 */
	findOptionById(id: string): GooSelectOption | null {
		return findOptionById(this.#options, id)
	}

	/**
	 * Get the currently hovered element.
	 */
	getHoveredElement(): OptionElement | null {
		return this.$container.querySelector('.goo-select__option--hovered')
	}

	/**
	 * Find a rendered option by logical id without treating the id as CSS.
	 * @param id - id.
	 */
	getOptionElementById(id: string): OptionElement | null {
		for (const item of this.getNavigableOptions()) {
			if (item.dataset.id === id) return item
		}
		return null
	}

	/**
	 * Find the enabled option under a viewport coordinate.
	 * @param clientY - client y.
	 * @param clientX - client x.
	 */
	getOptionElementAtPoint(clientX: number, clientY: number): OptionElement | null {
		const target = document.elementFromPoint(clientX, clientY)
		const item = target?.closest<HTMLElement>('.goo-select__option')
		if (
			!item ||
			!this.$container.contains(item) ||
			item.classList.contains('goo-select__option--disabled')
		) {
			return null
		}
		return item as OptionElement
	}

	/**
	 * Apply hover behavior for an option element.
	 * @param item - item.
	 */
	hoverOptionElement(item: HTMLElement): void {
		const option = this.#readOptionFromElement(item)
		if (!option) return
		this.#hoverOption(item, option)
	}

	/**
	 * Select a concrete option element when it is selectable.
	 * @param item - item.
	 */
	selectOptionElement(item: HTMLElement): boolean {
		if (item.classList.contains('goo-select__option--disabled')) return false

		const option = this.#readOptionFromElement(item)
		if (!option) return false
		if (option.type === 'submenu') {
			this.#openSubmenuOption(item, option)
			return true
		}

		this.#ctx.onSelect(option, item)
		return true
	}

	/**
	 * Handle type-ahead search.
	 * @param char - Single character to search for
	 */
	handleTypeahead(char: string) {
		clearTimeout(this.#typeaheadTimer!)
		this.#typeaheadBuffer += char.toLowerCase()

		this.#typeaheadTimer = setTimeout(() => {
			this.#typeaheadBuffer = ''
		}, TYPEAHEAD_TIMEOUT)

		// Find matching option
		const items = this.getNavigableOptions()
		const match = items.find($item => {
			const label =
				$item.querySelector('.goo-select__label')?.textContent?.toLowerCase() || ''
			return label.startsWith(this.#typeaheadBuffer)
		})

		if (match) {
			this.setHovered(match.dataset.id!)
		}
	}

	/**
	 * Reset typeahead state (called when menu closes).
	 */
	resetTypeahead() {
		this.#typeaheadBuffer = ''
		clearTimeout(this.#typeaheadTimer!)
	}

	/**
	 * Clean up resources.
	 */
	destroy() {
		this.#cancelSelectionAnimation()
		this.closeSubmenu()
		this.$container.removeEventListener('mouseenter', this.#handleContainerMouseEnter)
		this.$container.removeEventListener('mouseleave', this.#handleContainerMouseLeave)
		clearTimeout(this.#submenuTimer!)
		clearTimeout(this.#typeaheadTimer!)
		this.#typeaheadBuffer = ''
		this.hoveredId = null
		this.$container.removeAttribute('aria-activedescendant')
	}

	// --------------------------------------------------------------------------
	// Private Methods
	// --------------------------------------------------------------------------

	#renderOptionsList(opts: GooSelectOption[], container: HTMLElement, depth = 0) {
		for (const $item of this.#renderOptionElements(opts, depth)) {
			container.appendChild($item)
		}
	}

	#renderOptionElements(opts: GooSelectOption[], depth: number): HTMLElement[] {
		const items: HTMLElement[] = []
		let lastWasDivider = true

		for (const opt of opts) {
			// Check if supported
			if (
				opt.isSupported !== undefined &&
				!evaluate(opt.isSupported, this.#ctx.getContext())
			) {
				continue
			}

			const $item = this.#renderOption(opt, depth)
			if (!$item) continue

			const isDivider = $item.classList.contains('goo-select__divider')
			if (isDivider) {
				if (lastWasDivider) continue
				items.push($item)
				lastWasDivider = true
				continue
			}

			items.push($item)
			lastWasDivider = false
		}

		while (items.at(-1)?.classList.contains('goo-select__divider')) {
			items.pop()
		}

		return items
	}

	#renderOption(opt: GooSelectOption, depth: number): HTMLElement | null {
		const { showSelectionIndicator, value } = this.#ctx

		// Divider
		if (opt.type === 'divider') {
			const $div = document.createElement('div')
			$div.className = 'goo-select__divider'
			$div.setAttribute('role', 'separator')
			return $div
		}

		// Option group
		if (opt.type === 'optgroup') {
			const childItems = this.#renderOptionElements(opt.options || [], depth + 1)
			if (!childItems.some(item => this.#containsOptionRow(item))) return null

			const $group = document.createElement('div')
			$group.className = 'goo-select__optgroup'
			$group.setAttribute('role', 'group')

			const $label = document.createElement('div')
			$label.className = 'goo-select__optgroup-label'
			$label.textContent = evaluate(opt.label) as string
			$group.appendChild($label)

			for (const $item of childItems) {
				$group.appendChild($item)
			}
			return $group
		}

		// Regular option or submenu
		const isDisabled = evaluate(opt.isDisabled, this.#ctx.getContext())
		const isSelected = showSelectionIndicator && value === opt.id
		const isSubmenu = opt.type === 'submenu'
		if (isSubmenu && !this.#hasSupportedOptionRow(opt.options || [])) return null

		const $item = document.createElement('div')
		$item.className = [
			'goo-select__option',
			isDisabled ? 'goo-select__option--disabled' : '',
			isSelected ? 'goo-select__option--selected' : '',
			isSubmenu ? 'goo-select__option--submenu' : '',
			opt.tone === 'danger' ? 'goo-select__option--danger' : ''
		]
			.filter(Boolean)
			.join(' ')
		$item.id = `${ this.#instanceId }-opt-${ this.#optionSeq++ }`
		$item.setAttribute('role', 'option')
		$item.setAttribute('data-id', opt.id!)
		$item.setAttribute('aria-selected', String(isSelected))
		if (isDisabled) $item.setAttribute('aria-disabled', 'true')

		// Selection checkmark
		if (showSelectionIndicator) {
			const $check = document.createElement('span')
			$check.className = 'goo-select__check'
			$check.innerHTML = isSelected
				? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>'
				: ''
			$item.appendChild($check)
		}

		// Icon
		const $icon = createIcon(opt.icon)
		if ($icon) {
			$item.appendChild($icon)
		}

		// Label
		const $label = document.createElement('span')
		$label.className = 'goo-select__label'
		const labelVal = evaluate(opt.label)
		if (labelVal instanceof HTMLElement) {
			$label.appendChild(labelVal.cloneNode(true))
		} else {
			$label.textContent = labelVal as string
		}
		$item.appendChild($label)

		// Shortcut
		const shortcut = evaluate(opt.shortcut)
		if (shortcut) {
			const $shortcut = createShortcut(shortcut as string | string[])
			if ($shortcut) $item.appendChild($shortcut)
		}

		// Submenu arrow
		if (isSubmenu) {
			const $arrow = document.createElement('span')
			$arrow.className = 'goo-select__submenu-arrow'
			$arrow.innerHTML =
				'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
			$item.appendChild($arrow)
		}

		// Bind events
		this.#bindOptionEvents($item, opt, !!isDisabled)

		return $item
	}

	#bindOptionEvents($item: HTMLElement, opt: GooSelectOption, isDisabled: boolean) {
		// Hover (also handles drag-to-select hover)
		$item.addEventListener('mouseenter', () => {
			if (isDisabled) return
			this.#hoverOption($item, opt)
		})

		// Select/open on release so an already-open menu behaves like native selects.
		if (!isDisabled) {
			$item.addEventListener('pointerdown', event => {
				if (event.button !== 0) return
				event.preventDefault() // Prevent focus loss
			})
			$item.addEventListener('pointerup', event => {
				if (event.button !== 0) return
				event.preventDefault()
				if (opt.type === 'submenu') {
					this.#openSubmenuOption($item, opt)
					return
				}
				this.#ctx.onSelect(opt, $item)
			})
		}
	}

	#hoverOption($item: HTMLElement, opt: GooSelectOption): void {
		this.setHovered(opt.id!)

		// Handle submenu
		if (opt.type === 'submenu') {
			this.#cancelSubmenuTimer()
			if (this.#submenuPopout.isOpen()) {
				this.openSubmenu($item, opt)
				return
			}
			this.#submenuTimer = setTimeout(() => {
				this.openSubmenu($item, opt)
			}, SUBMENU_DELAY)
		} else if (this.$container.contains($item)) {
			// Close any open submenu when hovering non-submenu
			this.#scheduleSubmenuClose()
		} else {
			this.#cancelSubmenuTimer()
		}
	}

	#openSubmenuOption($item: HTMLElement, opt: GooSelectOption): void {
		this.setHovered(opt.id!)
		this.#cancelSubmenuTimer()
		this.openSubmenu($item, opt)
	}

	#cancelSubmenuTimer(): void {
		clearTimeout(this.#submenuTimer!)
		this.#submenuTimer = null
	}

	#cancelSelectionAnimation(): void {
		this.#selectionAnimationCleanup?.()
		this.#selectionAnimationCleanup = null
	}

	#scheduleSubmenuClose(relatedTarget: EventTarget | null = null): void {
		if (this.#isInsideMenuBoundary(relatedTarget)) return

		this.#cancelSubmenuTimer()
		this.clearHovered()
		this.#submenuTimer = setTimeout(() => {
			this.closeSubmenu()
		}, SUBMENU_DELAY)
	}

	#isInsideMenuBoundary(target: EventTarget | null): boolean {
		return (
			target instanceof Node &&
			(this.$container.contains(target) || this.#submenuPopout.containsElement(target))
		)
	}

	#containsOptionRow(item: HTMLElement): boolean {
		return item.classList.contains('goo-select__option') ||
			item.querySelector('.goo-select__option') !== null
	}

	#hasSupportedOptionRow(opts: GooSelectOption[]): boolean {
		for (const opt of opts) {
			if (
				opt.isSupported !== undefined &&
				!evaluate(opt.isSupported, this.#ctx.getContext())
			) {
				continue
			}
			if (opt.type === 'divider') continue
			if (opt.type === 'optgroup' || opt.type === 'submenu') {
				if (this.#hasSupportedOptionRow(opt.options || [])) return true
				continue
			}
			return true
		}
		return false
	}

	#readOptionFromElement(item: HTMLElement): GooSelectOption | null {
		const optionId = item.dataset.id
		return optionId ? this.findOptionById(optionId) : null
	}
}
