/**
 * @fileoverview Goo popout behavior with smart positioning
 * Self-contained popout system with support for positioning, containment,
 * nested popouts, click-outside detection, and CSS variable theming.
 * @module goo/popout/popout
 */

import './GooPopout.css'

import {
	applyArrowPosition,
	applyPosition,
	calculatePosition,
	type PositionAvoidRect,
	type PositionResult
} from '../support/positioning/index.ts'
import { createLifecycleBag } from '../support/utils/lifecycleBag.ts'
import {
	animatePopoutIn,
	animatePopoutOut,
	cancelPopoutAnimation,
	type PopoutAnimationState
} from './_popoutAnimation.ts'
import {
	createPopoutElement,
	type PopoutElement
} from './_popoutElement.ts'
import { setupPopoutEventHandlers } from './_popoutEvents.ts'
import {
	bindImmediateEscapeToClose,
	capturePopoutFocusTarget,
	restorePopoutFocus
} from './_popoutFocus.ts'
import {
	observeOpenLayoutChanges,
	stabilizeOpeningLayout
} from './_popoutLayout.ts'
import {
	getActivePopout,
	type GooPopoutRuntime,
	gooPopoutRuntime as sharedGooPopoutRuntime,
	registerActivePopout,
	unregisterActivePopout } from './_popoutRegistry.ts'

/** Runtime controls for the shared Goo popout registry. */
export interface GooPopoutManager {
	/** Close all active popouts. */
	closeAll(): void
	/** Close active popouts that do not contain the provided element. */
	closeOutside(target: HTMLElement): void
	/** Return the most recently opened popout. */
	getActive(): GooPopoutInstance | null
}

/** Shared Goo popout registry controls. */
export const gooPopoutRuntime: GooPopoutManager = sharedGooPopoutRuntime

// =============================================================================
// Goo Popout Factory
// =============================================================================

/**
 * Containment configuration.
 */
export interface PopoutKeepWithin {
	element?: HTMLElement
	margin?: number
	fullScreen?: boolean
}

/**
 * Target specification - element or coordinates with optional alignment/offset.
 */
export interface GooPopoutAt {
	element?: HTMLElement
	point?: { x?: number; y?: number }
	x?: number
	y?: number
	align?: string
	offset?: { x?: number; y?: number }
	avoidRects?: PositionAvoidRect[]
	avoidMargin?: number
}

/**
 * Options for creating a Goo popout instance.
 */
export interface GooPopoutOptions {
	content?: Element | Element[]
	parentElement?: HTMLElement
	ariaLabel?: string

	/**
	 * ARIA role for the popout container. Defaults to `'dialog'`.
	 * Pass `null` for a non-semantic wrapper when the content provides its own
	 * role (e.g. a `listbox`), so the container is not announced as a dialog.
	 */
	role?: string | null
	at?: HTMLElement | GooPopoutAt
	align?: string
	offset?: { x?: number; y?: number }
	keepWithin?: PopoutKeepWithin
	className?: string
	dataset?: Record<string, string>
	attributes?: Record<string, string | number | boolean | null | undefined>
	showArrow?: boolean
	showBackdrop?: boolean
	clickToClose?: boolean | ((event: GooPopoutPointerEvent, isInsidePopout: boolean) => boolean)
	escapeToClose?: boolean
	dragToMove?: boolean
	openImmediately?: boolean
	rtl?: boolean

	/**
	 * Controls initial focus behavior when popout opens.
	 * - 'content': Focus first focusable element in content (default)
	 * - 'popout': Focus the popout container itself
	 * - 'none': Don't move focus - keyboard stays where it was
	 */
	initialFocus?: 'content' | 'popout' | 'none'

	/**
	 * When true, popout expands to fill the entire viewport (mobile-friendly).
	 * Hides the arrow and ignores normal positioning.
	 */
	fullScreen?: boolean

	/**
	 * When true, the popout's own chrome (background, drop shadow,
	 * border-radius, arrow) is dropped so the content can supply its own
	 * visual frame. Use for self-themed sheets that would otherwise render
	 * as a box within a box. Positioning still anchors to the target.
	 */
	chromeless?: boolean
	onOpen?: (data: { element: HTMLElement; instance: GooPopoutInstance }) => void
	onClose?: (data: { element: HTMLElement; instance: GooPopoutInstance }) => void

	/** Called after each non-fullscreen placement calculation is applied. */
	onPosition?: (data: {
		element: HTMLElement
		instance: GooPopoutInstance
		position: PositionResult
	}) => void
	onDestroy?: () => void
}

/** Pointer event data passed to Goo popout callbacks. */
export interface GooPopoutPointerEvent {
	readonly originalEvent: PointerEvent
	readonly target: EventTarget | null
	readonly clientX: number
	readonly clientY: number
	readonly isTouch: boolean
	preventDefault: () => void
	stopPropagation: () => void
}

/**
 * GooPopout instance object returned from the factory function.
 */
export interface GooPopoutInstance {
	readonly element: HTMLElement | null
	readonly contentElement: HTMLElement | null
	readonly arrowElement: HTMLElement | null

	/** Most recently applied non-fullscreen position, if the popout has been placed. */
	readonly position: PositionResult | null
	isOpen: () => boolean
	open: () => Promise<void>
	close: () => Promise<void>
	toggle: () => void
	destroy: () => Promise<void>
	reposition: () => void

	/**
	 * Update the target position and reposition the popout.
	 * @param newAt - New target element or GooPopoutAt configuration
	 * @param newAlign - Optional new alignment string
	 */
	updatePosition: (newAt: GooPopoutAt | HTMLElement, newAlign?: string) => void
}

/**
 * Create a new popout instance.
 * @param {GooPopoutOptions} options - options.
 * @returns {GooPopoutInstance}
 */
export function createGooPopout(options: GooPopoutOptions = {}): GooPopoutInstance {
	const {
		content,
		parentElement = document.body,
		ariaLabel = 'Popout',
		role = 'dialog',
		at,
		align: alignInput,
		offset: offsetInput = { x: 15, y: 15 },
		keepWithin,
		className = '',
		dataset,
		attributes,
		showArrow = true,
		showBackdrop = false,
		clickToClose = true,
		escapeToClose = true,
		dragToMove = false,
		openImmediately = true,
		initialFocus = 'content',
		fullScreen: fullScreenOption = false,
		chromeless = false,
		rtl,
		onOpen,
		onClose,
		onPosition,
		onDestroy
	} = options

	// State
	let $element: PopoutElement | null = null
	let $arrow: HTMLElement | null = null
	let $backdrop: HTMLElement | null = null
	let opened = false
	let destroying = false
	let lifecycle = createLifecycleBag()
	let parentPopout: GooPopoutRuntime | null = null
	let childPopout: GooPopoutRuntime | null = null
	let currentPosition: ReturnType<typeof calculatePosition> | null = null
	let currentAvoidRects: PositionAvoidRect[] = []
	let currentAvoidMargin = 0
	let previousActiveElement: HTMLElement | null = null
	let repositionFrame = 0
	const animationState: PopoutAnimationState = {
		cleanup: null
	}
	const resolvedRtl =
		rtl ?? (document.documentElement?.dir === 'rtl' || document.body?.dir === 'rtl')
	const fallbackAlign = alignInput ?? (resolvedRtl ? 'right to left' : 'left to right')
	let currentAlign = fallbackAlign
	let currentOffset = { ...offsetInput }
	const fullScreen = fullScreenOption || !!keepWithin?.fullScreen

	// Parse target
	let targetElement: HTMLElement | null = null
	let targetPoint: { x: number; y: number } | null = null

	applyAtConfig(at)

	// ==========================================================================
	// Instance Object
	// ==========================================================================

	const instance: GooPopoutRuntime = {
		get element() {
			return $element
		},
		get contentElement() {
			return $element?.querySelector('.goo-popout__content') as HTMLElement | null
		},
		get arrowElement() {
			return $arrow
		},
		get position() {
			return currentPosition
		},
		isOpen() {
			return opened
		},
		get parent() {
			return parentPopout
		},
		set parent(p: GooPopoutRuntime | null) {
			parentPopout = p
		},
		get child() {
			return childPopout
		},
		set child(c: GooPopoutRuntime | null) {
			childPopout = c
		},

		open,
		close,
		toggle,
		destroy,
		reposition,
		updatePosition
	}

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	/**
	 * Open the popout.
	 * @returns {Promise<void>}
	 */
	async function open() {
		if (opened || destroying) return
		if (lifecycle.destroyed) lifecycle = createLifecycleBag()
		previousActiveElement = capturePopoutFocusTarget(initialFocus)

		// Create DOM
		const popoutElement = createPopoutElement({
			ariaLabel,
			attributes,
			chromeless,
			className,
			content,
			dataset,
			fullScreen,
			instance,
			role,
			showArrow,
			showBackdrop
		})
		$element = popoutElement.element
		$arrow = popoutElement.arrowElement
		$backdrop = popoutElement.backdropElement
		parentElement.appendChild($element)

		// Index parent-child chain
		indexParentChain()

		// Mark open before the first await so callers can synchronously observe the state.
		opened = true
		registerActivePopout(instance)
		bindImmediateEscapeToClose({
			close,
			escapeToClose,
			isActive: () => getActivePopout() === instance,
			isOpen: () => opened,
			lifecycle
		})

		await stabilizeOpeningLayout({
			element: $element,
			isActive: () => $element !== null && !destroying,
			reposition
		})
		if (!$element || destroying) return

		setupPopoutEventHandlers({
			clickToClose,
			close,
			dragToMove,
			element: $element,
			getArrowElement: () => $arrow,
			initialFocus,
			isClickInsidePopout: isClickInsidePopoutChain,
			isDestroying: () => destroying,
			isOpen: () => opened,
			lifecycle,
			reposition
		})
		if ($element) {
			observeOpenLayoutChanges({
				element: $element,
				fullScreen,
				lifecycle,
				reposition: scheduleReposition,
				targetElement
			})
		}

		$element.offsetHeight // Force reflow

		await animatePopoutIn({
			element: $element,
			isActive: () => !destroying && $element === popoutElement.element,
			state: animationState
		})
		if (!$element || destroying || !opened) return

		// Callback
		if (onOpen) onOpen({ element: $element, instance })
	}

	/**
	 * Close the popout.
	 * @returns {Promise<void>}
	 */
	async function close() {
		if (!opened || destroying) return

		opened = false
		unregisterActivePopout(instance)

		// Close child popouts first
		if (childPopout) {
			await childPopout.close()
			childPopout = null
		}

		// Callback
		if (onClose && $element) onClose({ element: $element, instance })

		// Animate out and destroy
		await destroy()
	}

	/**
	 * Toggle open/close.
	 */
	function toggle() {
		if (opened) {
			close()
		} else {
			open()
		}
	}

	/**
	 * Destroy the popout.
	 * @returns {Promise<void>}
	 */
	async function destroy() {
		if (destroying || !$element) return
		destroying = true
		const removedElement = $element

		lifecycle.destroy()
		cancelScheduledReposition()
		cancelPopoutAnimation(animationState)

		// Remove from parent chain
		if (parentPopout) {
			parentPopout.child = null
		}

		// Animate out
		await animatePopoutOut($element, animationState)

		// Remove from DOM
		if ($backdrop) {
			$backdrop.remove()
			$backdrop = null
		}

		$element.remove()
		$element = null
		$arrow = null

		unregisterActivePopout(instance)
		destroying = false
		lifecycle = createLifecycleBag()

		// Callback
		if (onDestroy) onDestroy()
		previousActiveElement = restorePopoutFocus(removedElement, previousActiveElement)
	}

	/**
	 * Reposition the popout.
	 */
	function reposition() {
		if (!$element) return

		// Full-screen mode: expand to fill viewport
		if (fullScreen) {
			const style = $element.style
			style.position = 'fixed'
			style.left = '0'
			style.top = '0'
			style.width = '100%'
			style.height = '100%'
			style.maxWidth = '100%'
			style.maxHeight = '100%'

			// Hide arrow in full-screen mode
			if ($arrow) {
				$arrow.style.display = 'none'
			}

			// Update content to fill
			const $contentEl = $element.querySelector('.goo-popout__content') as HTMLElement
			if ($contentEl) {
				$contentEl.style.maxHeight = '100%'
				$contentEl.style.height = '100%'
			}

			return
		}

		const keepWithinElement = keepWithin?.element ?? document.documentElement
		const keepWithinMargin = keepWithin?.margin ?? 15

		const positionOptions = {
			element: targetElement ?? undefined,
			x: targetPoint?.x,
			y: targetPoint?.y,
			align: currentAlign,
			offset: currentOffset,
			keepWithin: { $element: keepWithinElement, margin: keepWithinMargin },
			avoidMargin: currentAvoidMargin,
			avoidRects: currentAvoidRects,
			rtl: resolvedRtl
		}

		currentPosition = calculatePosition($element, positionOptions)
		applyPosition($element, currentPosition)
		applyArrowPosition($arrow, currentPosition)
		onPosition?.({ element: $element, instance, position: currentPosition })
	}

	function scheduleReposition() {
		if (!opened || destroying || repositionFrame) return
		repositionFrame = requestAnimationFrame(() => {
			repositionFrame = 0
			reposition()
		})
	}

	function cancelScheduledReposition() {
		if (!repositionFrame) return
		cancelAnimationFrame(repositionFrame)
		repositionFrame = 0
	}

	/**
	 * Update the target position and reposition the popout.
	 * @param newAt - New target element or coordinates
	 * @param newAlign - Optional new alignment string
	 */
	function updatePosition(newAt: GooPopoutAt | HTMLElement, newAlign?: string) {
		applyAtConfig(newAt as GooPopoutAt | HTMLElement)
		if (newAlign) {
			currentAlign = newAlign
		}

		scheduleReposition()
	}

	/**
	 * Check if click was inside this popout, its children, or its trigger element.
	 * @param {HTMLElement} target - target.
	 * @returns {boolean}
	 */
	function isClickInsidePopoutChain(target: HTMLElement): boolean {
		let el: HTMLElement | null = target
		while (el) {
			// Check if click is on the trigger element (for toggle behavior)
			if (targetElement && el === targetElement) {
				return true
			}

			// Check if it's a popout
			const popoutEl = el as PopoutElement
			if (popoutEl._isGooPopout) {
				// Check if it's this popout or a descendant
				let p: GooPopoutRuntime | null = instance
				while (p) {
					if (popoutEl._popoutInstance === p) return true
					p = p.child
				}
			}

			// Check for cancel-destroy class
			if (el.classList?.contains('goo-cancel-close')) {
				return true
			}

			el = el.parentElement
		}
		return false
	}

	function applyAtConfig(atConfig?: GooPopoutAt | HTMLElement) {
		if (!atConfig) return

		if (atConfig instanceof HTMLElement) {
			targetElement = atConfig
			targetPoint = null
			currentAvoidRects = []
			currentAvoidMargin = 0
			return
		}

		if (typeof atConfig !== 'object') return

		if (atConfig.element instanceof HTMLElement) {
			targetElement = atConfig.element
			targetPoint = null
		} else {
			const point = atConfig.point
			const pointX = point?.x ?? atConfig.x
			const pointY = point?.y ?? atConfig.y
			if (pointX != null || pointY != null) {
				targetElement = null
				targetPoint = { x: pointX ?? 0, y: pointY ?? 0 }
			}
		}

		if (atConfig.align) {
			currentAlign = atConfig.align
		}

		if (atConfig.offset) {
			currentOffset = { ...currentOffset, ...atConfig.offset }
		}

		currentAvoidRects = normalizeAvoidRects(atConfig.avoidRects)
		currentAvoidMargin = Number.isFinite(atConfig.avoidMargin) ? atConfig.avoidMargin! : 0
	}

	function normalizeAvoidRects(avoidRects: PositionAvoidRect[] | undefined): PositionAvoidRect[] {
		return (avoidRects ?? []).filter(
			rect =>
				Number.isFinite(rect.left) &&
				Number.isFinite(rect.right) &&
				Number.isFinite(rect.top) &&
				Number.isFinite(rect.bottom) &&
				rect.right >= rect.left &&
				rect.bottom >= rect.top
		)
	}

	/**
	 * Index parent-child chain by traversing up from target element.
	 */
	function indexParentChain() {
		if (!targetElement) return

		let el: HTMLElement | null = targetElement
		while (el) {
			const popoutEl = el as PopoutElement
			if (popoutEl._isGooPopout && popoutEl._popoutInstance) {
				parentPopout = popoutEl._popoutInstance
				parentPopout.child = instance
				return
			}
			el = el.parentElement
		}
	}

	// ==========================================================================
	// Auto-open
	// ==========================================================================

	if (openImmediately) {
		open()
	}

	return instance
}

// =============================================================================
// Export
// =============================================================================
