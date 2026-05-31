/**
 * @fileoverview DropdownPanel - Manages rendering and visual state of dropdown options.
 * @module goobits/select/DropdownPanel
 */

import { SubmenuPopoutController } from './_submenuPopout.js'
import { createIcon, createShortcut, evaluate } from './selectDom.js'
import type { GooSelectOption } from './types.js'

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

// Internal type for option elements with custom properties
type OptionElement = HTMLElement & { _submenuOptions?: GooSelectOption[] }

/**
 * Context provided by GooSelect to the panel.
 */
export interface DropdownPanelContext {

	/** Whether to show selection checkmarks */
	enableSelection: boolean

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

	constructor(ctx: DropdownPanelContext) {
		this.#ctx = ctx
		this.#submenuPopout = new SubmenuPopoutController((options, container) => {
			this.#renderOptionsList(options, container)
		})
		this.listboxId = `${ this.#instanceId }-listbox`
		this.$container = document.createElement('div')
		this.$container.className = 'goo-select__options'
		this.$container.id = this.listboxId
		this.$container.setAttribute('role', 'listbox')
		this.$container.setAttribute('tabindex', '-1')
	}

	// --------------------------------------------------------------------------
	// Public API
	// --------------------------------------------------------------------------

	/**
	 * Update context (e.g., when selected value changes).
	 */
	updateContext(ctx: Partial<DropdownPanelContext>) {
		Object.assign(this.#ctx, ctx)
	}

	/**
	 * Render options to the container.
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
	 */
	animateSelection($item: HTMLElement): Promise<void> {
		return new Promise<void>(resolve => {
			const duration = 60 // ms per step

			// Mark as animating
			$item.dataset.isChosen = 'true'
			this.$container.dataset.isChoosingOption = 'true'

			let step = 0
			const totalSteps = 3

			const nextStep = () => {
				const isHighlighted = step % 2 === 0

				if (isHighlighted) {
					$item.classList.add('goo-select__option--flash')
				} else {
					$item.classList.remove('goo-select__option--flash')
				}

				step++
				if (step <= totalSteps) {
					setTimeout(nextStep, duration)
				} else {
					// Cleanup
					$item.classList.remove('goo-select__option--flash')
					$item.dataset.isChosen = ''
					this.$container.dataset.isChoosingOption = ''
					resolve()
				}
			}

			nextStep()
		})
	}

	/**
	 * Open a submenu for an option.
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
	 */
	findOptionById(id: string): GooSelectOption | null {
		return this.#findOptionByIdRecursive(this.#options, id)
	}

	/**
	 * Get the currently hovered element.
	 */
	getHoveredElement(): OptionElement | null {
		return this.$container.querySelector('.goo-select__option--hovered')
	}

	/**
	 * Find a rendered option by logical id without treating the id as CSS.
	 */
	getOptionElementById(id: string): OptionElement | null {
		for (const item of this.getNavigableOptions()) {
			if (item.dataset.id === id) return item
		}
		return null
	}

	/**
	 * Find the enabled option under a viewport coordinate.
	 */
	getOptionElementAtPoint(clientX: number, clientY: number): OptionElement | null {
		const target = document.elementFromPoint(clientX, clientY)
		const item = target?.closest<HTMLElement>('.goo-select__option')
		if (!item || !this.$container.contains(item) || item.classList.contains('goo-select__option--disabled')) {
			return null
		}
		return item as OptionElement
	}

	/**
	 * Apply hover behavior for an option element.
	 */
	hoverOptionElement(item: HTMLElement): void {
		const option = this.#readOptionFromElement(item)
		if (!option) return
		this.#hoverOption(item, option)
	}

	/**
	 * Select a concrete option element when it is selectable.
	 */
	selectOptionElement(item: HTMLElement): boolean {
		if (item.classList.contains('goo-select__option--disabled')) return false

		const option = this.#readOptionFromElement(item)
		if (!option || option.type === 'submenu') return false

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
			const label = $item.querySelector('.goo-select__label')?.textContent?.toLowerCase() || ''
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
		this.closeSubmenu()
		clearTimeout(this.#submenuTimer!)
		clearTimeout(this.#typeaheadTimer!)
		this.#typeaheadBuffer = ''
		this.hoveredId = null
		this.$container.removeAttribute('aria-activedescendant')
	}

	// --------------------------------------------------------------------------
	// Private Methods
	// --------------------------------------------------------------------------

	#findOptionByIdRecursive(opts: GooSelectOption[], id: string): GooSelectOption | null {
		for (const opt of opts) {
			if (opt.id === id) return opt
			if (opt.options) {
				const found = this.#findOptionByIdRecursive(opt.options, id)
				if (found) return found
			}
		}
		return null
	}

	#renderOptionsList(opts: GooSelectOption[], container: HTMLElement, depth = 0) {
		for (const opt of opts) {
			// Check if supported
			if (opt.isSupported !== undefined && !evaluate(opt.isSupported, this.#ctx.getContext())) {
				continue
			}

			const $item = this.#renderOption(opt, depth)
			if ($item) container.appendChild($item)
		}
	}

	#renderOption(opt: GooSelectOption, depth: number): HTMLElement | null {
		const { enableSelection, value } = this.#ctx

		// Divider
		if (opt.type === 'divider') {
			const $div = document.createElement('div')
			$div.className = 'goo-select__divider'
			$div.setAttribute('role', 'separator')
			return $div
		}

		// Option group
		if (opt.type === 'optgroup') {
			const $group = document.createElement('div')
			$group.className = 'goo-select__optgroup'
			$group.setAttribute('role', 'group')

			const $label = document.createElement('div')
			$label.className = 'goo-select__optgroup-label'
			$label.textContent = evaluate(opt.label) as string
			$group.appendChild($label)

			this.#renderOptionsList(opt.options || [], $group, depth + 1)
			return $group
		}

		// Regular option or submenu
		const isDisabled = evaluate(opt.isDisabled, this.#ctx.getContext())
		const isSelected = enableSelection && value === opt.id
		const isSubmenu = opt.type === 'submenu'

		const $item = document.createElement('div')
		$item.className = [
			'goo-select__option',
			isDisabled ? 'goo-select__option--disabled' : '',
			isSelected ? 'goo-select__option--selected' : '',
			isSubmenu ? 'goo-select__option--submenu' : ''
		]
			.filter(Boolean)
			.join(' ')
		$item.id = `${ this.#instanceId }-opt-${ this.#optionSeq++ }`
		$item.setAttribute('role', 'option')
		$item.setAttribute('data-id', opt.id!)
		$item.setAttribute('aria-selected', String(isSelected))
		if (isDisabled) $item.setAttribute('aria-disabled', 'true')

		// Selection checkmark
		if (enableSelection) {
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

			// Store submenu options on element (for keyboard navigation)
			;($item as OptionElement)._submenuOptions = opt.options
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

		// Select on release so an already-open menu behaves like native selects.
		if (!isDisabled && opt.type !== 'submenu') {
			$item.addEventListener('pointerdown', event => {
				event.preventDefault() // Prevent focus loss
			})
			$item.addEventListener('pointerup', event => {
				event.preventDefault()
				this.#ctx.onSelect(opt, $item)
			})
		}
	}

	#hoverOption($item: HTMLElement, opt: GooSelectOption): void {
		this.setHovered(opt.id!)

		// Handle submenu
		if (opt.type === 'submenu') {
			clearTimeout(this.#submenuTimer!)
			if (this.#submenuPopout.opened) {
				this.openSubmenu($item, opt)
				return
			}
			this.#submenuTimer = setTimeout(() => {
				this.openSubmenu($item, opt)
			}, SUBMENU_DELAY)
		} else {
			// Close any open submenu when hovering non-submenu
			clearTimeout(this.#submenuTimer!)
			this.#submenuTimer = setTimeout(() => {
				this.closeSubmenu()
			}, SUBMENU_DELAY)
		}
	}

	#readOptionFromElement(item: HTMLElement): GooSelectOption | null {
		const optionId = item.dataset.id
		return optionId ? this.findOptionById(optionId) : null
	}
}
