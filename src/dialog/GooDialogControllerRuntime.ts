/**
 * @fileoverview GooDialog - Modal dialog component with support for alert, confirm, prompt types.
 * @module goobits/dialog/GooDialog
 */

import './GooDialog.css'

import type { CheckboxFieldElement } from '../checkbox/_createCheckboxField.ts'
import { focusFirst, focusLast, getFocusableElements } from '../support/utils/focusUtils.ts'
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
} from './dialogBuilder.ts'
import { dialogManager } from './GooDialogManager.ts'

// Re-export types for consumers
export type { DialogField, DialogLabels } from './dialogBuilder.ts'

// ============================================================================
// Types
// ============================================================================

/** Supported Goo dialog presentation types. */
export type GooDialogType = 'alert' | 'confirm' | 'prompt' | 'notify' | 'overlay'

/** Focus targets accepted by standard Goo dialogs. */
export type GooDialogDefaultFocus = 'ok' | 'cancel' | 'disregard'

/** Values collected from dialog fields. */
export type DialogValues<TValues extends Record<string, unknown> = Record<string, unknown>> = TValues

/** Field element map passed to dialog verification callbacks. */
export type DialogFieldElements = Map<string, HTMLElement>

/** Verification callback for prompt dialogs. */
export type DialogVerifyHandler<TValues extends DialogValues = DialogValues> =
	(values: TValues, fieldElements: DialogFieldElements) => boolean | Promise<boolean>

/**
 * Dialog options for construction
 */
export interface GooDialogOptions<TValues extends DialogValues = DialogValues> {
	type?: GooDialogType
	ariaLabel?: string
	heading?: string
	content?: string | Node
	labels?: DialogLabels
	fields?: DialogField[]
	verify?: DialogVerifyHandler<TValues>
	showBackdrop?: boolean
	showClose?: boolean
	closeOnBackdrop?: boolean
	closeOnEscape?: boolean
	defaultFocus?: GooDialogDefaultFocus
	width?: string | number
	height?: string | number
	className?: string
	autoDismiss?: number
	onOk?: (result: DialogResult<TValues>) => void
	onCancel?: (result: DialogResult<TValues>) => void
	onClose?: () => void
}

/**
 * Dialog result
 */
export interface DialogResult<TValues extends DialogValues = DialogValues> {
	ok?: boolean
	cancel?: boolean
	disregard?: boolean
	applyToAll?: boolean
	values?: TValues
}

/**
 * State interface for GooDialog.
 */
export interface GooDialogState {
	ariaLabel?: string
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

/** Public handle returned by `createGooDialog`. */
export interface GooDialogController<TValues extends DialogValues = DialogValues> {
	/** Root dialog element. */
	readonly element: HTMLElement
	/** Whether the dialog is currently open. */
	readonly isOpen: boolean
	/** Close the dialog. */
	close(): Promise<void>
	/** Open the dialog and resolve with the user's action. */
	open(): Promise<DialogResult<TValues>>
	/** Replace dialog content. Strings render as text; pass a DOM node for rich content. */
	setContent(content: string | Node): void
}

/**
 * Internal dialog implementation.
 */
class GooDialogControllerRuntime {
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
	declare _content: string | Node
	declare _labels: DialogLabels
	declare _fields: DialogField[]
	declare _verify: DialogVerifyHandler | undefined
	declare _className: string | undefined
	declare _resolve: ((result: DialogResult) => void) | null
	declare _fieldElements: DialogFieldElements
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

	/**
	 * Creates a GooDialogController instance.
	 *
	 * @param options - options.
	 */
	constructor(options: GooDialogOptions = {}) {
		this.$element = document.createElement('div')
		this.$element.className = 'goo-dialog'
		this.state = {
			ariaLabel: undefined,
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

	/**
	 * Creates element.
	 */
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

		// Give the dialog an accessible name from its title, explicit label, or short text content.
		this._applyAccessibleName()

		// Focus trap sentinels
		const { $start, $end } = createFocusTrapSentinels()
		this._$focusTrapStart = $start
		this._$focusTrapEnd = $end

		this.$element.insertBefore(this._$focusTrapStart, this.$element.firstChild)
		this.$element.appendChild(this._$focusTrapEnd)

		this._bindEvents()
	}

	/**
	 * Destroy element.
	 */
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
	 * Reference the title, or use an explicit/string label, so `role="dialog"` exposes an accessible name.
	 */
	_applyAccessibleName() {
		const instanceId = `goo-dialog-${ ++dialogInstanceCount }`
		if (this.$title) {
			if (!this.$title.id) this.$title.id = `${ instanceId }-title`
			this.$element.setAttribute('aria-labelledby', this.$title.id)
			this.$element.removeAttribute('aria-label')
			return
		}

		const label = this.state.ariaLabel || (typeof this._content === 'string' ? this._content.trim() : '')
		if (!label) return

		this.$element.setAttribute('aria-label', label)
		this.$element.removeAttribute('aria-labelledby')
	}

	// --------------------------------------------------------------------------
	// Event Binding
	// --------------------------------------------------------------------------

	/**
	 * Bind events.
	 */
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

	/**
	 * Handles keydown.
	 *
	 * @param e - e.
	 */
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

	/**
	 * Handles ok.
	 */
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

	/**
	 * Handles cancel.
	 */
	_handleCancel() {
		const result: DialogResult = { cancel: true }
		if (this._onCancel) this._onCancel(result)
		this._resolve?.(result)
		this._resolve = null
		this.close()
	}

	/**
	 * Handles disregard.
	 */
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

	/**
	 * Gets field values.
	 */
	_getFieldValues(): DialogValues {
		const values: DialogValues = {}
		for (const [ name, $el ] of this._fieldElements) {
			const elWithValue = $el as unknown as { value?: unknown; getValue?: () => unknown; state?: { value?: unknown } }
			values[name] = elWithValue.value ?? elWithValue.getValue?.() ?? elWithValue.state?.value ?? ''
		}
		return values
	}

	// --------------------------------------------------------------------------
	// Focus Management
	// --------------------------------------------------------------------------

	/**
	 * Sets initial focus.
	 */
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

	/**
	 * Focus first.
	 */
	_focusFirst() {
		focusFirst(this.$element, '.goo-dialog__focus-trap')
	}

	/**
	 * Focus last.
	 */
	_focusLast() {
		focusLast(this.$element, '.goo-dialog__focus-trap')
	}

	/**
	 * Gets focusable elements.
	 */
	_getFocusableElements() {
		return getFocusableElements(this.$element, '.goo-dialog__focus-trap')
	}

	// --------------------------------------------------------------------------
	// Auto Dismiss
	// --------------------------------------------------------------------------

	/**
	 * Start auto dismiss.
	 */
	_startAutoDismiss() {
		if (this.state.autoDismiss > 0) {
			this._autoDismissTimer = setTimeout(() => {
				this._handleCancel()
			}, this.state.autoDismiss)
		}
	}

	/**
	 * Clears auto dismiss.
	 */
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
	 * @param {string|Node} content - content. Strings render as text; pass a DOM node for rich markup.
	 */
	setContent(content: string | Node) {
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

	/**
	 * Root dialog element.
	 */
	get element(): HTMLElement {
		return this.$element
	}
}

interface GooDialogControllerRuntime extends GooDialogController {}

// ============================================================================
// Registration & Export
// ============================================================================

/**
 * Goo dialog instance.
 */
export type GooDialogInstance<TValues extends DialogValues = DialogValues> = GooDialogController<TValues>

/**
 * Creates goo dialog.
 *
 * @param options - options.
 */
export function createGooDialog<TValues extends DialogValues = DialogValues>(
	options: GooDialogOptions<TValues> = {}
): GooDialogController<TValues> {
	return new GooDialogControllerRuntime(options as GooDialogOptions) as GooDialogController<TValues>
}
