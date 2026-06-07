/**
 * @fileoverview Goo tooltip behavior built on GooPopout
 *
 * Composes GooPopout with hover/focus triggers and timing delays.
 * Follows DRY principle by reusing popout's positioning, arrows, and animations.
 *
 * @module goo/tooltip/GooTooltip
 *
 * @example
 * // Basic usage
 * const tooltip = createGooTooltip({
 *   for: myButton,
 *   content: 'Save document'
 * })
 *
 * // With options
 * const tooltip = createGooTooltip({
 *   for: myButton,
 *   content: 'Click to save',
 *   align: 'center left to center right',
 *   showDelay: 200,
 *   arrow: true
 * })
 *
 * // Manual control
 * tooltip.show()
 * tooltip.hide()
 * tooltip.destroy()
 */

import './GooTooltip.css'

import type { GooPopoutAt } from '../popout/index.ts'
import { createGooPopout } from '../popout/index.ts'

/** Infer popout instance type from factory return */
type GooPopoutInstance = ReturnType<typeof createGooPopout>

// =============================================================================
// Types
// =============================================================================

/**
 * Goo tooltip options.
 */
export interface GooTooltipOptions {

	/** Target element to attach tooltip to (required) */
	for: HTMLElement

	/** Text content for tooltip */
	content?: string

	/** Custom element content (alternative to content string) */
	contentElement?: HTMLElement

	/** Alignment relative to target. Default: 'center bottom to center top' (above) */
	align?: string

	/** Offset from target in pixels. Default: { x: 0, y: 8 } */
	offset?: { x?: number; y?: number }

	/** Delay before showing in ms. Default: 400 */
	showDelay?: number

	/** Delay before hiding in ms. Default: 0 */
	hideDelay?: number

	/** What triggers the tooltip. Default: 'both' (hover and keyboard focus, per WCAG 1.4.13). */
	trigger?: 'hover' | 'focus' | 'both' | 'manual'

	/** Show directional arrow. Default: true */
	arrow?: boolean

	/** Allow hovering over tooltip without it closing. Default: false */
	interactive?: boolean

	/** Callback when tooltip shows */
	onshow?: (ctx: { element: HTMLElement }) => void

	/** Callback when tooltip hides */
	onhide?: (ctx: { element: HTMLElement }) => void

	/** Additional class name applied to the tooltip popout. */
	className?: string
}

/**
	 * Goo tooltip instance.
	 */
export interface GooTooltipInstance {

	/** The tooltip DOM element (null when hidden and not yet created) */
	readonly element: HTMLElement | null

	/** Whether tooltip is currently visible */
	readonly visible: boolean

	/** Show the tooltip immediately */
	show(): void

	/** Hide the tooltip immediately */
	hide(): void

	/** Destroy the tooltip and clean up event listeners */
	destroy(): void

	/** Update tooltip content 	 * @param content - content.
	 */
	setContent(content: string | HTMLElement): void

	/** Update tooltip position when its target or anchor point moves. */
	updatePosition(at?: GooPopoutAt | HTMLElement, align?: string): void
}

/** Options accepted by the Svelte `tooltip` action. */
export type GooTooltipActionOptions = Omit<GooTooltipOptions, 'for'>

// =============================================================================
// GooTooltip Factory
// =============================================================================

/**
 * Create a tooltip instance attached to a target element.
 *
 * @param options - Tooltip configuration
 * @returns Tooltip instance with show/hide/destroy methods
 */
export function createGooTooltip(options: GooTooltipOptions): GooTooltipInstance {
	const {
		for: target,
		content = '',
		contentElement: providedContentElement,
		align = 'center bottom to center top',
		offset = { x: 0, y: 8 },
		showDelay = 400,
		hideDelay = 0,
		trigger = 'both',
		arrow = true,
		interactive = false,
		className = '',
		onshow,
		onhide
	} = options

	// State
	let popout: GooPopoutInstance | null = null
	let contentElement: HTMLElement | null = null
	let showTimeout: ReturnType<typeof setTimeout> | null = null
	let hideTimeout: ReturnType<typeof setTimeout> | null = null
	let isDestroyed = false
	const cleanups: Array<() => void> = []

	// Generate unique ID for a11y
	const tooltipId = `goo-tooltip-${ Math.random().toString(36).slice(2, 9) }`

	// -------------------------------------------------------------------------
	// Content Element (created once, reused)
	// -------------------------------------------------------------------------

	function getContentElement(): HTMLElement {
		if (contentElement) return contentElement

		if (providedContentElement) {
			contentElement = providedContentElement
		} else {
			contentElement = document.createElement('span')
			contentElement.className = 'goo-tooltip__text'
			contentElement.textContent = content
		}

		return contentElement
	}

	// -------------------------------------------------------------------------
	// Show/Hide
	// -------------------------------------------------------------------------

	function show() {
		cancelHide()
		if (isDestroyed || popout?.isOpen()) return

		const configureTooltipElement = ($element: HTMLElement) => {
			$element.id = tooltipId
			$element.setAttribute('role', 'tooltip')
		}

		// Create popout on first show (lazy DOM creation)
		if (!popout) {
			popout = createGooPopout({
				content: getContentElement(),
				at: target,
				align,
				offset,
				showArrow: arrow,
				className: `goo-tooltip ${ className }`.trim(),
				clickToClose: false, // Tooltip closes on mouse leave, not click
				escapeToClose: true,
				openImmediately: false, // We control timing
				initialFocus: 'none', // Tooltip must not steal focus from the hover target.
				onOpen: ({ element }) => {
					configureTooltipElement(element)
				}
			})
		}

		popout.open()
		if (popout.element) configureTooltipElement(popout.element)

		// a11y: link target to tooltip
		target.setAttribute('aria-describedby', tooltipId)

		// Interactive: keep open when hovering tooltip itself
		if (interactive && popout.element) {
			popout.element.dataset.interactive = 'true'
			popout.element.addEventListener('mouseenter', cancelHide)
			popout.element.addEventListener('mouseleave', scheduleHide)
		}

		if (onshow && popout.element) {
			onshow({ element: popout.element })
		}
	}

	function hide() {
		cancelShow()
		if (isDestroyed || !popout?.isOpen()) return

		popout.close()
		target.removeAttribute('aria-describedby')

		if (onhide && popout.element) {
			onhide({ element: popout.element })
		}
	}

	function scheduleShow() {
		cancelHide()
		if (isDestroyed || popout?.isOpen()) return
		showTimeout = setTimeout(show, showDelay)
	}

	function scheduleHide() {
		cancelShow()
		if (isDestroyed || !popout?.isOpen()) return
		hideTimeout = setTimeout(hide, hideDelay)
	}

	function cancelShow() {
		if (showTimeout) {
			clearTimeout(showTimeout)
			showTimeout = null
		}
	}

	function cancelHide() {
		if (hideTimeout) {
			clearTimeout(hideTimeout)
			hideTimeout = null
		}
	}

	// -------------------------------------------------------------------------
	// Content Update
	// -------------------------------------------------------------------------

	function setContent(newContent: string | HTMLElement) {
		if (typeof newContent === 'string') {
			if (contentElement) {
				contentElement.textContent = newContent
			} else {
				// Update for next show
				contentElement = document.createElement('span')
				contentElement.className = 'goo-tooltip__text'
				contentElement.textContent = newContent
			}
		} else {
			contentElement = newContent

			// If popout exists and is showing, update its content
			if (popout?.contentElement) {
				popout.contentElement.innerHTML = ''
				popout.contentElement.appendChild(newContent)
			}
		}
	}

	function updatePosition(at: GooPopoutAt | HTMLElement = target, nextAlign?: string) {
		popout?.updatePosition(at, nextAlign)
	}

	// -------------------------------------------------------------------------
	// Event Binding
	// -------------------------------------------------------------------------

	if (trigger === 'hover' || trigger === 'both') {
		const onEnter = () => scheduleShow()
		const onLeave = () => scheduleHide()
		target.addEventListener('mouseenter', onEnter)
		target.addEventListener('mouseleave', onLeave)
		cleanups.push(() => target.removeEventListener('mouseenter', onEnter))
		cleanups.push(() => target.removeEventListener('mouseleave', onLeave))
	}

	if (trigger === 'focus' || trigger === 'both') {
		const onFocus = () => scheduleShow()
		const onBlur = () => scheduleHide()
		target.addEventListener('focus', onFocus)
		target.addEventListener('blur', onBlur)
		cleanups.push(() => target.removeEventListener('focus', onFocus))
		cleanups.push(() => target.removeEventListener('blur', onBlur))
	}

	// Hide on scroll (tooltip doesn't follow target)
	const onScroll = () => {
		if (popout?.isOpen()) hide()
	}
	window.addEventListener('scroll', onScroll, { capture: true, passive: true })
	cleanups.push(() => window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions))

	// Hide on window blur (user switched tabs/windows)
	const onWindowBlur = () => {
		if (popout?.isOpen()) hide()
	}
	window.addEventListener('blur', onWindowBlur)
	cleanups.push(() => window.removeEventListener('blur', onWindowBlur))

	// -------------------------------------------------------------------------
	// Cleanup
	// -------------------------------------------------------------------------

	function destroy() {
		if (isDestroyed) return
		isDestroyed = true

		cancelShow()
		cancelHide()

		// Clean up event listeners
		for (const cleanup of cleanups) {
			cleanup()
		}
		cleanups.length = 0

		// Remove a11y attribute
		target.removeAttribute('aria-describedby')

		// Destroy popout
		if (popout) {
			popout.destroy()
			popout = null
		}

		contentElement = null
	}

	// -------------------------------------------------------------------------
	// Instance
	// -------------------------------------------------------------------------

	return {
		get element() {
			return popout?.element ?? null
		},
		get visible() {
			return popout?.isOpen() ?? false
		},
		show,
		hide,
		destroy,
		setContent,
		updatePosition
	}
}

/**
 * Svelte action that attaches Goo tooltip behavior to an element.
 *
 * @param node - Element that owns the tooltip.
 * @param options - Tooltip options excluding the target element.
 * @returns Svelte action lifecycle hooks.
 */
export function tooltip(node: HTMLElement, options: GooTooltipActionOptions = {}) {
	let instance = createGooTooltip({ ...options, for: node })

	return {
		update(nextOptions: GooTooltipActionOptions = {}) {
			instance.destroy()
			instance = createGooTooltip({ ...nextOptions, for: node })
		},
		destroy() {
			instance.destroy()
		}
	}
}
