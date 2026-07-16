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
	type PositionAvoidRect
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
	capturePopoutFocusTarget,
	restorePopoutFocus
} from './_popoutFocus.ts'
import { bindImmediatePopoutEscapeToClose } from './_popoutKeyboard.ts'
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
import type {
	GooPopoutAt,
	GooPopoutInstance,
	GooPopoutManager,
	GooPopoutOptions
} from './popoutTypes.ts'

export type {
	GooPopoutAt,
	GooPopoutInstance,
	GooPopoutManager,
	GooPopoutOptions,
	GooPopoutPointerEvent,
	PopoutKeepWithin
} from './popoutTypes.ts'

/** Shared Goo popout registry controls. */
export const gooPopoutRuntime: GooPopoutManager = sharedGooPopoutRuntime

// =============================================================================
// Goo Popout Factory
// =============================================================================

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
		ariaLabelledby,
		ariaDescribedby,
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
	let closePromise: Promise<void> | null = null
	let destroyPromise: Promise<void> | null = null
	let lifecycle = createLifecycleBag()
	let parentPopout: GooPopoutRuntime | null = null
	const childPopouts = new Set<GooPopoutRuntime>()
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
		get children() {
			return childPopouts
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
		if (opened || destroying || closePromise) return
		if (lifecycle.destroyed) lifecycle = createLifecycleBag()
		previousActiveElement = capturePopoutFocusTarget(initialFocus)

		// Create DOM
		const popoutElement = createPopoutElement({
			ariaLabel,
			ariaLabelledby,
			ariaDescribedby,
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
		bindImmediatePopoutEscapeToClose({
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

		$element.getBoundingClientRect() // Force reflow

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
	function close(): Promise<void> {
		if (closePromise) return closePromise
		if (!opened || destroying) return Promise.resolve()

		closePromise = closePopout()
		return closePromise
	}

	async function closePopout(): Promise<void> {
		try {
			opened = false
			unregisterActivePopout(instance)

			if (childPopouts.size) await closeChildPopouts()

			if (onClose && $element) onClose({ element: $element, instance })

			await destroy()
		} finally {
			closePromise = null
		}
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
	function destroy(): Promise<void> {
		if (destroyPromise) return destroyPromise
		if (!$element) return Promise.resolve()

		destroyPromise = destroyPopout()
		return destroyPromise
	}

	async function destroyPopout(): Promise<void> {
		destroying = true
		opened = false
		unregisterActivePopout(instance)
		const removedElement = $element
		if (!removedElement) {
			destroying = false
			destroyPromise = null
			return
		}

		try {
			if (childPopouts.size) await closeChildPopouts()
			lifecycle.destroy()
			cancelScheduledReposition()
			cancelPopoutAnimation(animationState)
			parentPopout?.children.delete(instance)
			parentPopout = null

			await animatePopoutOut(removedElement, animationState)

			if ($backdrop) {
				$backdrop.remove()
				$backdrop = null
			}

			removedElement.remove()
			$element = null
			$arrow = null
			lifecycle = createLifecycleBag()
		} finally {
			destroying = false
			destroyPromise = null
		}

		if (onDestroy) onDestroy()
		previousActiveElement = restorePopoutFocus(removedElement, previousActiveElement)
	}

	async function closeChildPopouts(): Promise<void> {
		const children = Array.from(childPopouts)
		await Promise.all(children.map(child => child.close()))
		childPopouts.clear()
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
			if (popoutEl._isGooPopout && isThisPopoutOrDescendant(popoutEl._popoutInstance)) {
				return true
			}

			// Check for cancel-destroy class
			if (el.classList?.contains('goo-cancel-close')) {
				return true
			}

			el = el.parentElement
		}
		return false
	}

	function isThisPopoutOrDescendant(popout: GooPopoutRuntime | undefined): boolean {
		let current = popout ?? null
		while (current) {
			if (current === instance) return true
			current = current.parent
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
			if ((pointX !== null && pointX !== undefined) || (pointY !== null && pointY !== undefined)) {
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
				parentPopout.children.add(instance)
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
