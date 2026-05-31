/**
 * @fileoverview GooDialog - Modal dialog component with support for alert, confirm, prompt types.
 * @module goobits/dialog/GooDialog
 */

import './GooDialog.css'

import type { CheckboxFieldElement } from '../checkbox/_createCheckboxField.js'
import { focusFirst, focusLast, getFocusableElements } from '../utils/focusUtils.js'
import {
	appendContent,
	buildFields,
	buildFooter,
	buildNotifyLayout,
	buildOverlayLayout,
	buildStandardLayout,
	createFocusTrapSentinels,
	type DialogField,
	type DialogLabels
} from './dialogBuilder.js'
import { dialogManager } from './GooDialogManager.js'

// Re-export types for consumers
export type { DialogField, DialogLabels } from './dialogBuilder.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Dialog options for construction
 */
export interface GooDialogOptions {
	type?: 'alert' | 'confirm' | 'prompt' | 'notify' | 'overlay'
	heading?: string
	content?: string | HTMLElement
	labels?: DialogLabels
	fields?: DialogField[]
	verify?: (values: Record<string, unknown>, fieldElements: Map<string, HTMLElement>) => boolean | Promise<boolean>
	showBackdrop?: boolean
	showClose?: boolean
	closeOnBackdrop?: boolean
	closeOnEscape?: boolean
	defaultFocus?: 'ok' | 'cancel' | 'disregard'
	width?: string | number
	height?: string | number
	className?: string
	autoDismiss?: number
	onOk?: (result: DialogResult) => void
	onCancel?: (result: DialogResult) => void
	onClose?: () => void
}

/**
 * Dialog result
 */
export interface DialogResult {
	ok?: boolean
	cancel?: boolean
	disregard?: boolean
	applyToAll?: boolean
	values?: Record<string, unknown>
}

/**
 * State interface for GooDialog.
 */
export interface GooDialogState {
	type: string
	heading: string
	showBackdrop: boolean
	showClose: boolean
	closeOnBackdrop: boolean
	closeOnEscape: boolean
	defaultFocus: string
	width: string | number
	height: string | number
	autoDismiss: number
}

// ============================================================================
// Constants
// ============================================================================

const TRANSITION_DURATION = 150

/** Monotonic counter giving each dialog a unique id namespace for its accessible name. */
let dialogInstanceCount = 0

const DEFAULT_LABELS: DialogLabels = {
	ok: 'OK',
	cancel: 'Cancel'
}

// ============================================================================
// GooDialog Controller
// ============================================================================

/**
 * Modal dialog component with support for alert, confirm, prompt types.
 * Provides a promise-based API for user interaction.
 *
 * @attr {string} type - Dialog type: 'alert', 'confirm', 'prompt', 'notify', 'overlay'
 * @attr {string} heading - Dialog title/heading text
 * @attr {boolean} showBackdrop - Whether to show backdrop overlay
 * @attr {boolean} showClose - Whether to show close button
 * @attr {boolean} closeOnBackdrop - Whether clicking backdrop closes dialog
 * @attr {boolean} closeOnEscape - Whether Escape key closes dialog
 * @attr {string} defaultFocus - Which button to focus: 'ok', 'cancel', 'disregard'
 * @attr {string} width - Dialog width (e.g., '400px' or 'auto')
 * @attr {string} height - Dialog height (e.g., '300px' or 'auto')
 * @attr {number} autoDismiss - Auto-dismiss after milliseconds (for notify type)
 *
 * @fires {CustomEvent} close - Fired when dialog is closed
 *
 */
export class GooDialogController {
	readonly $element: HTMLElement
	state: GooDialogState

	// DOM element references
	declare $header: HTMLElement | null
	declare $title: HTMLElement | null
	declare $content: HTMLElement | null
	declare $fields: HTMLElement | null
	declare $footer: HTMLElement | null
	declare $okBtn: HTMLButtonElement | null
	declare $cancelBtn: HTMLButtonElement | null
	declare $disregardBtn: HTMLButtonElement | null
	declare $closeBtn: HTMLElement | null
	declare $closeBadge: HTMLElement | null
	declare $applyToAll: CheckboxFieldElement | null

	// Internal state
	declare _content: string | HTMLElement
	declare _labels: DialogLabels
	declare _fields: DialogField[]
	declare _verify: ((values: Record<string, unknown>, fieldElements: Map<string, HTMLElement>) => boolean | Promise<boolean>) | undefined
	declare _className: string | undefined
	declare _resolve: ((result: DialogResult) => void) | null
	declare _fieldElements: Map<string, HTMLElement>
	declare _$backdrop: HTMLElement | null
	declare _$focusTrapStart: HTMLElement | null
	declare _$focusTrapEnd: HTMLElement | null
	declare _isOpen: boolean
	declare _autoDismissTimer: ReturnType<typeof setTimeout> | null
	declare _previousActiveElement: HTMLElement | null

	// Callback functions
	declare _onOk: ((result: DialogResult) => void) | undefined
	declare _onCancel: ((result: DialogResult) => void) | undefined
	declare _onClose: (() => void) | undefined

	constructor(options: GooDialogOptions = {}) {
		this.$element = document.createElement('div')
		this.$element.className = 'goo-dialog'
		this.state = {
			type: 'alert',
			heading: '',
			showBackdrop: true,
			showClose: true,
			closeOnBackdrop: true,
			closeOnEscape: true,
			defaultFocus: 'ok',
			width: 'auto',
			height: 'auto',
			autoDismiss: 0,
			...options
		}

		this._content = options.content || ''
		this._labels = { ...DEFAULT_LABELS, ...options.labels }
		this._fields = options.fields || []
		this._verify = options.verify
		this._onOk = options.onOk
		this._onCancel = options.onCancel
		this._onClose = options.onClose
		this._className = options.className

		// Internal state
		this._resolve = null
		this._fieldElements = new Map()
		this._$backdrop = null
		this._isOpen = false
		this._autoDismissTimer = null
		this._createElement()
	}

	// --------------------------------------------------------------------------
	// Lifecycle
	// --------------------------------------------------------------------------

	_createElement() {
		const { type, width, height, heading, showClose } = this.state

		// Apply type class
		this.$element.classList.add(`goo-dialog--${ type }`)
		if (this._className) {
			this.$element.classList.add(this._className)
		}

		// Set dimensions
		if (width !== 'auto') {
			this.$element.style.width = typeof width === 'number' ? `${ width }px` : String(width)
		}
		if (height !== 'auto') {
			this.$element.style.height = typeof height === 'number' ? `${ height }px` : String(height)
		}

		// Accessibility
		this.$element.setAttribute('role', 'dialog')
		this.$element.setAttribute('aria-modal', 'true')
		this.$element.tabIndex = -1

		// Build structure based on type using dialog builder functions
		if (type === 'notify') {
			const notifyElements = buildNotifyLayout(this.$element, this._content, showClose)
			this.$content = notifyElements.$content
			this.$closeBtn = notifyElements.$closeBtn
		} else if (type === 'overlay') {
			const overlayElements = buildOverlayLayout(this.$element, { type, heading, showClose }, this._content)
			this.$header = overlayElements.$header
			this.$title = overlayElements.$title
			this.$content = overlayElements.$content
			this.$closeBtn = overlayElements.$closeBtn
		} else {
			// Standard layout (alert, confirm, prompt)
			const standardElements = buildStandardLayout(
				this.$element,
				{ type, heading, showClose },
				this._content,
				this._labels,
				this._fields
			)
			this.$header = standardElements.$header
			this.$title = standardElements.$title
			this.$content = standardElements.$content
			this.$fields = standardElements.$fields
			this.$footer = standardElements.$footer
			this.$closeBtn = standardElements.$closeBtn
			this.$closeBadge = standardElements.$closeBadge

			// Build fields if we have a fields container
			if (this.$fields) {
				this._fieldElements = buildFields(this.$fields, this._fields)
			}

			// Build footer buttons if we have a footer
			if (this.$footer) {
				const footerElements = buildFooter(this.$footer, this._labels)
				this.$okBtn = footerElements.$okBtn
				this.$cancelBtn = footerElements.$cancelBtn
				this.$disregardBtn = footerElements.$disregardBtn
				this.$applyToAll = footerElements.$applyToAll
			}
		}

		// Give the dialog an accessible name from its title (or content as a fallback).
		this._applyAccessibleName()

		// Focus trap sentinels
		const { $start, $end } = createFocusTrapSentinels()
		this._$focusTrapStart = $start
		this._$focusTrapEnd = $end

		this.$element.insertBefore(this._$focusTrapStart, this.$element.firstChild)
		this.$element.appendChild(this._$focusTrapEnd)

		this._bindEvents()
	}

	_destroyElement() {
		this._clearAutoDismiss()
		this.$header = null
		this.$title = null
		this.$content = null
		this.$fields = null
		this.$footer = null
		this.$okBtn = null
		this.$cancelBtn = null
		this.$disregardBtn = null
		this.$closeBtn = null
		this.$closeBadge = null
		this.$applyToAll = null
		this._fieldElements.clear()
	}

	/**
	 * Reference the title (or content) so `role="dialog"` exposes an accessible name.
	 */
	_applyAccessibleName() {
		const instanceId = `goo-dialog-${ ++dialogInstanceCount }`
		const $named = this.$title ?? this.$content
		if (!$named) return

		if (!$named.id) $named.id = `${ instanceId }-${ this.$title ? 'title' : 'content' }`
		this.$element.setAttribute('aria-labelledby', $named.id)
	}

	// --------------------------------------------------------------------------
	// Event Binding
	// --------------------------------------------------------------------------

	_bindEvents() {
		// Close buttons
		if (this.$closeBtn) {
			this.$closeBtn.addEventListener('click', () => this._handleCancel())
		}
		if (this.$closeBadge) {
			this.$closeBadge.addEventListener('click', () => this._handleCancel())
		}

		// Footer buttons
		if (this.$okBtn) {
			this.$okBtn.addEventListener('click', () => this._handleOk())
		}
		if (this.$cancelBtn) {
			this.$cancelBtn.addEventListener('click', () => this._handleCancel())
		}
		if (this.$disregardBtn) {
			this.$disregardBtn.addEventListener('click', () => this._handleDisregard())
		}

		// Keyboard
		this.$element.addEventListener('keydown', e => this._handleKeydown(e))

		// Focus trap
		this._$focusTrapStart?.addEventListener('focus', () => this._focusLast())
		this._$focusTrapEnd?.addEventListener('focus', () => this._focusFirst())
	}

	_handleKeydown(e) {
		// Only the topmost dialog reacts to keys, so stacked dialogs close one at a time.
		if (dialogManager.getTopDialog() !== this) return

		if (e.key === 'Escape' && this.state.closeOnEscape) {
			e.preventDefault()
			e.stopPropagation()
			this._handleCancel()
		}

		if (e.key === 'Enter') {
			// If focused on OK button or no input is focused
			const activeEl = document.activeElement
			const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA'

			if (activeEl === this.$okBtn || !isInput) {
				e.preventDefault()
				this._handleOk()
			}
		}
	}

	// --------------------------------------------------------------------------
	// Actions
	// --------------------------------------------------------------------------

	async _handleOk() {
		// Validate if verify function provided
		if (this._verify) {
			const values = this._getFieldValues()
			const valid = await Promise.resolve(this._verify(values, this._fieldElements))
			if (!valid) return
		}

		const result: DialogResult = {
			ok: true,
			applyToAll: (this.$applyToAll as unknown as { checked: boolean })?.checked ?? false,
			values: this._getFieldValues()
		}

		if (this._onOk) this._onOk(result)
		this._resolve?.(result)
		this._resolve = null
		this.close()
	}

	_handleCancel() {
		const result: DialogResult = { cancel: true }
		if (this._onCancel) this._onCancel(result)
		this._resolve?.(result)
		this._resolve = null
		this.close()
	}

	_handleDisregard() {
		const result: DialogResult = {
			disregard: true,
			applyToAll: (this.$applyToAll as unknown as { checked: boolean })?.checked ?? false,
			values: this._getFieldValues()
		}
		this._resolve?.(result)
		this._resolve = null
		this.close()
	}

	_getFieldValues(): Record<string, unknown> {
		const values: Record<string, unknown> = {}
		for (const [ name, $el ] of this._fieldElements) {
			const elWithValue = $el as unknown as { value?: unknown; getValue?: () => unknown; state?: { value?: unknown } }
			values[name] = elWithValue.value ?? elWithValue.getValue?.() ?? elWithValue.state?.value ?? ''
		}
		return values
	}

	// --------------------------------------------------------------------------
	// Focus Management
	// --------------------------------------------------------------------------

	_setInitialFocus() {
		// Focus first field for prompt
		if (this.state.type === 'prompt' && this._fieldElements.size > 0) {
			const [ , $first ] = this._fieldElements.entries().next().value
			const firstWithFocus = $first as unknown as { focus?: () => void; select?: () => void }
			if (firstWithFocus?.focus) {
				firstWithFocus.focus()
				if (firstWithFocus.select) firstWithFocus.select()
				return
			}
		}

		// Focus specified button
		const { defaultFocus } = this.state
		let $focus: { focus: () => void } | null = null

		if (defaultFocus === 'ok' && this.$okBtn) {
			$focus = this.$okBtn as unknown as { focus: () => void }
		} else if (defaultFocus === 'cancel' && this.$cancelBtn) {
			$focus = this.$cancelBtn as unknown as { focus: () => void }
		} else if (defaultFocus === 'disregard' && this.$disregardBtn) {
			$focus = this.$disregardBtn as unknown as { focus: () => void }
		}

		if ($focus) {
			$focus.focus()
		} else {
			this.$element.focus()
		}
	}

	_focusFirst() {
		focusFirst(this.$element, '.goo-dialog__focus-trap')
	}

	_focusLast() {
		focusLast(this.$element, '.goo-dialog__focus-trap')
	}

	_getFocusableElements() {
		return getFocusableElements(this.$element, '.goo-dialog__focus-trap')
	}

	// --------------------------------------------------------------------------
	// Auto Dismiss
	// --------------------------------------------------------------------------

	_startAutoDismiss() {
		if (this.state.autoDismiss > 0) {
			this._autoDismissTimer = setTimeout(() => {
				this._handleCancel()
			}, this.state.autoDismiss)
		}
	}

	_clearAutoDismiss() {
		if (this._autoDismissTimer) {
			clearTimeout(this._autoDismissTimer)
			this._autoDismissTimer = null
		}
	}

	// --------------------------------------------------------------------------
	// Public API
	// --------------------------------------------------------------------------

	/**
	 * Open the dialog and return a promise with the result.
	 * @returns {Promise<DialogResult>}
	 */
	open() {
		if (this._isOpen) return Promise.resolve({ cancel: true })

		return new Promise(resolve => {
			this._resolve = resolve
			this._isOpen = true

			// Store previous focus
			this._previousActiveElement = document.activeElement as HTMLElement | null

			// Register with manager
			dialogManager.register(this)

			// Create backdrop
			if (this.state.showBackdrop && this.state.type !== 'notify') {
				this._$backdrop = document.createElement('div')
				this._$backdrop.className = 'goo-dialog-backdrop'
				this._$backdrop.style.setProperty('--goo-dialog-z-index', String(dialogManager.getZIndex(this)))

				if (this.state.closeOnBackdrop) {
					this._$backdrop.addEventListener('click', () => this._handleCancel())
				}

				document.body.appendChild(this._$backdrop)

				// Animate backdrop in
				requestAnimationFrame(() => {
					if (!this._isOpen || !this._$backdrop) return
					this._$backdrop.classList.add('goo-dialog-backdrop--visible')
				})
			}

			// Set z-index
			this.$element.style.setProperty('--goo-dialog-z-index', String(dialogManager.getZIndex(this)))

			// Append to body
			document.body.appendChild(this.$element)

			// Animate in
			requestAnimationFrame(() => {
				if (!this._isOpen || !document.body.contains(this.$element)) return
				this.$element.setAttribute('open', '')
				this._setInitialFocus()
				this._startAutoDismiss()
			})
		})
	}

	/**
	 * Close the dialog.
	 * @returns {Promise<void>}
	 */
	async close() {
		if (!this._isOpen) return

		this._isOpen = false
		this._clearAutoDismiss()

		// Resolve the promise if not already resolved (e.g., when called via widget.destroy())
		// This ensures .then()/.finally() handlers are triggered
		if (this._resolve) {
			this._resolve({ cancel: true })
			this._resolve = null
		}

		// Animate out
		this.$element.classList.add('goo-dialog--hiding')
		if (this._$backdrop) {
			this._$backdrop.classList.remove('goo-dialog-backdrop--visible')
			this._$backdrop.classList.add('goo-dialog-backdrop--hiding')
		}

		// Wait for animation
		await new Promise(r => setTimeout(r, TRANSITION_DURATION))

		// Cleanup
		this.$element.removeAttribute('open')
		this.$element.classList.remove('goo-dialog--hiding')
		this.$element.remove()

		if (this._$backdrop) {
			this._$backdrop.remove()
			this._$backdrop = null
		}

		// Unregister
		dialogManager.unregister(this)

		// Restore focus
		if (this._previousActiveElement?.focus) {
			this._previousActiveElement.focus()
		}

		// Callback
		if (this._onClose) this._onClose()
	}

	/**
	 * Update dialog content.
	 * @param {string|HTMLElement} content
	 */
	setContent(content: string | HTMLElement) {
		this._content = content
		if (this.$content) {
			this.$content.innerHTML = ''
			appendContent(this.$content, content)
		}
	}

	/**
	 * Check if dialog is open.
	 * @returns {boolean}
	 */
	get isOpen() {
		return this._isOpen
	}

	querySelector<T extends Element = Element>(selectors: string): T | null {
		return this.$element.querySelector<T>(selectors)
	}

	querySelectorAll<T extends Element = Element>(selectors: string): NodeListOf<T> {
		return this.$element.querySelectorAll<T>(selectors)
	}

	setAttribute(name: string, value: string): void {
		this.$element.setAttribute(name, value)
	}

	getAttribute(name: string): string | null {
		return this.$element.getAttribute(name)
	}

	addEventListener(...args: Parameters<HTMLElement['addEventListener']>): void {
		this.$element.addEventListener(...args)
	}

	removeEventListener(...args: Parameters<HTMLElement['removeEventListener']>): void {
		this.$element.removeEventListener(...args)
	}

	dispatchEvent(event: Event): boolean {
		return this.$element.dispatchEvent(event)
	}
}

// ============================================================================
// Registration & Export
// ============================================================================

export type GooDialogInstance = GooDialogController

export function createGooDialog(options: GooDialogOptions = {}): GooDialogController {
	return new GooDialogController(options)
}

export default createGooDialog
