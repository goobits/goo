/**
 * @fileoverview Goo popout behavior with smart positioning
 * Self-contained popout system with support for positioning, containment,
 * nested popouts, click-outside detection, and CSS variable theming.
 * @module goo/popout/popout
 */

import './GooPopout.css'

import { applyArrowPosition, applyPosition, calculatePosition, type PositionResult } from '../support/positioning/index.ts'
import { createPointerDrag } from '../support/utils/pointerDrag.ts'

// =============================================================================
// Popout Registry (for parent-child chains)
// =============================================================================

const activePopouts = new Set<GooPopoutRuntime>()

/**
 * Close all active popouts.
 */
function closeAllPopouts() {
	for (const popout of Array.from(activePopouts)) {
		popout.close()
	}
}

/**
 * Close active popouts that do not contain the provided element.
 * This preserves parent panes while switching between sibling popouts inside them.
 * @param target - Element that should keep its containing popout chain open.
 */
function closePopoutsOutside(target: HTMLElement) {
	for (const popout of Array.from(activePopouts)) {
		const element = popout.element
		if (element?.contains(target)) {
			continue
		}

		popout.close()
	}
}

/**
 * Get the currently active popout (most recently opened).
 * @returns {GooPopoutInstance|null}
 */
function getActivePopout() {
	const arr = Array.from(activePopouts)
	return arr[arr.length - 1] || null
}

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
export const gooPopoutRuntime: GooPopoutManager = {
	closeAll: closeAllPopouts,
	closeOutside: closePopoutsOutside,
	getActive: getActivePopout
}

// =============================================================================
// Goo Popout Factory
// =============================================================================

/**
 * Extended HTMLElement with popout-specific properties.
 */
interface PopoutElement extends HTMLElement {
	_factoryControlled?: boolean
	_isGooPopout?: boolean
	_popoutInstance?: GooPopoutRuntime
}

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
	onPosition?: (data: { element: HTMLElement; instance: GooPopoutInstance; position: PositionResult }) => void
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

interface GooPopoutRuntime extends GooPopoutInstance {
	parent: GooPopoutRuntime | null
	child: GooPopoutRuntime | null
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
	const cleanupHandlers: Array<(() => void) | { detach?: () => void }> = []
	let parentPopout: GooPopoutRuntime | null = null
	let childPopout: GooPopoutRuntime | null = null
	let currentPosition: ReturnType<typeof calculatePosition> | null = null
	let previousActiveElement: HTMLElement | null = null
	let repositionFrame = 0
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
		if (initialFocus !== 'none') {
			previousActiveElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null
		}

		// Create DOM
		$element = createPopoutElement()
		parentElement.appendChild($element)

		// Index parent-child chain
		indexParentChain()

		// Mark open before the first await so callers can synchronously observe the state.
		opened = true
		activePopouts.add(instance)

		await stabilizeOpeningLayout()
		if (!$element || destroying) return

		setupEventHandlers()
		observeOpenLayoutChanges()

		$element.offsetHeight // Force reflow

		await animateIn($element)
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
		activePopouts.delete(instance)

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

		// Cleanup handlers
		for (const cleanup of cleanupHandlers) {
			if (typeof cleanup === 'function') {
				cleanup()
			} else if (cleanup?.detach) {
				cleanup.detach()
			}
		}
		cleanupHandlers.length = 0
		cancelScheduledReposition()

		// Remove from parent chain
		if (parentPopout) {
			parentPopout.child = null
		}

		// Animate out
		await animateOut($element)

		// Remove from DOM
		if ($backdrop) {
			$backdrop.remove()
			$backdrop = null
		}

		$element.remove()
		$element = null
		$arrow = null

		activePopouts.delete(instance)
		destroying = false

		// Callback
		if (onDestroy) onDestroy()
		restoreFocus(removedElement)
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

	async function stabilizeOpeningLayout() {
		if (!$element) return

		$element.style.visibility = 'hidden'
		$element.style.pointerEvents = 'none'
		$element.style.opacity = '0'
		reposition()

		await waitForQuietOpeningLayout()
		if (!$element || destroying) return

		reposition()
		$element.style.visibility = ''
		$element.style.pointerEvents = ''
	}

	function waitForQuietOpeningLayout() {
		return new Promise<void>(resolve => {
			let frame = 0
			let finished = false
			let quietFrames = 0
			const observers: Array<{ disconnect(): void }> = []
			const timeout = setTimeout(finish, 240)

			function finish() {
				if (finished) return
				finished = true
				cancelAnimationFrame(frame)
				clearTimeout(timeout)
				observers.forEach(observer => observer.disconnect())
				resolve()
			}

			function schedule() {
				if (finished) return
				if (frame) return
				frame = requestAnimationFrame(() => {
					frame = 0
					if (!$element || destroying) {
						finish()
						return
					}

					reposition()
					quietFrames += 1
					if (quietFrames >= 2) {
						finish()
						return
					}

					schedule()
				})
			}

			function markDirty() {
				if (finished) return
				quietFrames = 0
				schedule()
			}

			if (typeof ResizeObserver === 'function' && $element) {
				const resizeObserver = new ResizeObserver(markDirty)
				resizeObserver.observe($element)
				const $contentEl = $element.querySelector('.goo-popout__content')
				if ($contentEl) {
					resizeObserver.observe($contentEl)
				}
				observers.push(resizeObserver)
			}

			if (typeof MutationObserver === 'function' && $element) {
				const mutationObserver = new MutationObserver(markDirty)
				mutationObserver.observe($element, {
					childList: true,
					subtree: true
				})
				observers.push(mutationObserver)
			}

			schedule()
		})
	}

	function observeOpenLayoutChanges() {
		if (!$element || fullScreen) return

		if (typeof ResizeObserver === 'function') {
			const resizeObserver = new ResizeObserver(scheduleReposition)
			resizeObserver.observe($element)
			const $contentEl = $element.querySelector('.goo-popout__content')
			if ($contentEl) {
				resizeObserver.observe($contentEl)
			}
			if (targetElement) {
				resizeObserver.observe(targetElement)
			}
			cleanupHandlers.push(() => resizeObserver.disconnect())
		}

		if (typeof MutationObserver === 'function') {
			const mutationObserver = new MutationObserver(scheduleReposition)
			mutationObserver.observe($element, {
				childList: true,
				subtree: true
			})
			cleanupHandlers.push(() => mutationObserver.disconnect())
		}
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

	// ==========================================================================
	// DOM Creation
	// ==========================================================================

	/**
	 * Create the popout DOM element.
	 * @returns {PopoutElement}
	 */
	function createPopoutElement(): PopoutElement {
		const el = document.createElement('div') as PopoutElement
		const fullScreenClass = fullScreen ? 'goo-popout--fullscreen' : ''
		const chromelessClass = chromeless ? 'goo-popout--chromeless' : ''
		el.className = `goo-popout ${ fullScreenClass } ${ chromelessClass } ${ className }`
			.replace(/\s+/g, ' ')
			.trim()
		el.tabIndex = 0
		if (role) {
			el.setAttribute('role', role)
			el.setAttribute('aria-label', ariaLabel)
		}

		// Dataset
		if (dataset) {
			Object.assign(el.dataset, dataset)
		}

		if (attributes) {
			for (const [ key, value ] of Object.entries(attributes)) {
				if (value === null || value === undefined || value === false) continue
				el.setAttribute(key, value === true ? '' : String(value))
			}
		}

		// Mark as popout for click detection
		el._isGooPopout = true
		el._popoutInstance = instance

		// Backdrop
		if (showBackdrop) {
			$backdrop = document.createElement('div')
			$backdrop.className = 'goo-popout__backdrop'
			el.appendChild($backdrop)
		}

		// Arrow — never shown when the popout is chromeless, since the arrow
		// inherits the (now absent) panel color and would float as an orphan
		// triangle next to the content's own frame.
		if (showArrow && !chromeless) {
			$arrow = document.createElement('div')
			$arrow.className = 'goo-popout__arrow'
			el.appendChild($arrow)
		}

		// Content wrapper
		const contentWrapper = document.createElement('div')
		contentWrapper.className = 'goo-popout__content'

		if (content) {
			const contentItems = Array.isArray(content) ? content : [ content ]
			for (const item of contentItems) {
				if (item instanceof HTMLElement && item.dataset.gooPopoutStaged === 'true') {
					item.hidden = false
				}
				contentWrapper.appendChild(item)
			}
		}

		el.appendChild(contentWrapper)

		return el
	}

	// ==========================================================================
	// Event Handlers
	// ==========================================================================

	/**
	 * Setup event handlers for click-outside, escape, resize, drag.
	 */
	function setupEventHandlers() {
		if (!$element) return

		// Click outside to close
		if (clickToClose) {
			// Delay to prevent immediate close from triggering click
			setTimeout(() => {
				if (!opened) return

				const handlePointerDown = (event: PointerEvent) => {
					if (!opened) return

					const pointerEvent = toGooPointerEvent(event)
					const clickedElement = pointerEvent.target as HTMLElement
					const isInsidePopout = isClickInsidePopoutChain(clickedElement)

					if (typeof clickToClose === 'function') {
						if (clickToClose(pointerEvent, isInsidePopout)) {
							close()
						}
					} else if (!isInsidePopout) {
						close()
					}
				}

				document.addEventListener('pointerdown', handlePointerDown, { capture: true })
				cleanupHandlers.push(() => {
					document.removeEventListener('pointerdown', handlePointerDown, {
						capture: true
					})
				})
			}, 100)
		}

		// Escape to close
		if (escapeToClose) {
			const handleKeydown = (e: KeyboardEvent) => {
				if (e.key === 'Escape' && opened) {
					e.stopPropagation()
					close()
				}
			}
			$element.addEventListener('keydown', handleKeydown)
			cleanupHandlers.push(() => $element?.removeEventListener('keydown', handleKeydown))
		}

		// Reposition on resize
		const handleResize = () => {
			if (opened) reposition()
		}
		window.addEventListener('resize', handleResize)
		cleanupHandlers.push(() => window.removeEventListener('resize', handleResize))

		// Prevent scroll propagation
		const handleWheel = (e: WheelEvent) => {
			const scrollContainer = getScrollableWheelContainer(e)
			if (!scrollContainer) {
				e.stopPropagation()
				return
			}

			const { scrollTop, scrollHeight, clientHeight } = scrollContainer
			const atTop = scrollTop === 0
			const atBottom = scrollTop + clientHeight >= scrollHeight

			if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
				e.preventDefault()
			}
			e.stopPropagation()
		}
		$element.addEventListener('wheel', handleWheel, { passive: false })
		cleanupHandlers.push(() => $element?.removeEventListener('wheel', handleWheel))

		// Drag to move
		if (dragToMove) {
			setupDragToMove()
		}

		// Focus handling based on initialFocus option
		if (initialFocus !== 'none') {
			requestAnimationFrame(() => {
				if (!$element) return

				if (initialFocus === 'content') {
					// Try to focus first focusable element in content
					const focusable = $element.querySelector<HTMLElement>(
						'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
					)
					if (focusable) {
						focusable.focus({ preventScroll: true })
						return
					}
				}

				// 'popout' mode or fallback if no focusable content found
				$element.focus({ preventScroll: true })
			})
		}
	}

	function restoreFocus(removedElement: HTMLElement) {
		if (!previousActiveElement) return
		const activeElement = document.activeElement
		if (
			activeElement instanceof HTMLElement &&
			activeElement !== document.body &&
			activeElement !== document.documentElement &&
			activeElement.isConnected &&
			!removedElement.contains(activeElement)
		) {
			previousActiveElement = null
			return
		}

		const focusTarget = previousActiveElement
		previousActiveElement = null
		if (focusTarget.isConnected) {
			focusTarget.focus({ preventScroll: true })
		}
	}

	/**
	 * Resolve the scroll container that should consume a wheel event inside the popout.
	 * Walk up from the event target so nested scroll regions keep the wheel interaction
	 * instead of letting it chain through the document underneath.
	 * @param e - e.
	 */
	function getScrollableWheelContainer(e: WheelEvent) {
		const root = $element
		if (!root) return null

		let node = e.target instanceof HTMLElement ? e.target : null
		while (node && node !== root) {
			const style = window.getComputedStyle(node)
			const canScrollY = /auto|scroll|overlay/.test(style.overflowY)
			if (canScrollY && node.scrollHeight > node.clientHeight) {
				return node
			}
			node = node.parentElement
		}

		return root.querySelector('.goo-popout__content') as HTMLElement | null
	}

	/**
	 * Setup drag-to-move behavior.
	 */
	function setupDragToMove() {
		let startX: number, startY: number, startLeft: number, startTop: number
		let _hasDragged = false

		const handler = createPointerDrag(
			$element!,
			event => {
				if (event.START) {
					const rect = $element!.getBoundingClientRect()
					startX = event.clientX
					startY = event.clientY
					startLeft = rect.left
					startTop = rect.top
					_hasDragged = false
				}

				if (!event.DOWN) return
				const dx = event.clientX - startX
				const dy = event.clientY - startY
				if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5) return

				_hasDragged = true
				event.preventDefault()

				$element!.style.left = `${ startLeft + dx }px`
				$element!.style.top = `${ startTop + dy }px`

				// Hide arrow when dragged
				if ($arrow) {
					$arrow.classList.add('goo-popout__arrow--hidden')
				}
			},
			{ ignoreTouch: true }
		)

		cleanupHandlers.push(handler)
	}

	function toGooPointerEvent(event: PointerEvent): GooPopoutPointerEvent {
		return {
			originalEvent: event,
			target: event.target,
			clientX: event.clientX,
			clientY: event.clientY,
			isTouch: event.pointerType === 'touch',
			preventDefault: () => event.preventDefault(),
			stopPropagation: () => event.stopPropagation()
		}
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
	// Animations
	// ==========================================================================

	/**
	 * Animate popout in.
	 * @param {HTMLElement} el - el.
	 * @returns {Promise<void>}
	 */
	function animateIn(el: HTMLElement): Promise<void> {
		return new Promise(resolve => {
			el.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out'
			el.style.transform = 'translateY(-4px)'
			el.style.opacity = '0'

			requestAnimationFrame(() => {
				el.style.transform = 'translateY(0)'
				el.style.opacity = '1'

				setTimeout(resolve, 150)
			})
		})
	}

	/**
	 * Animate popout out.
	 * @param {HTMLElement} el - el.
	 * @returns {Promise<void>}
	 */
	function animateOut(el: HTMLElement | null): Promise<void> {
		return new Promise<void>(resolve => {
			if (!el) {
				resolve()
				return
			}

			el.style.transition = 'opacity 150ms ease-out'
			el.style.opacity = '0'

			setTimeout(resolve, 150)
		})
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
