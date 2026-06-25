/**
 * @fileoverview GooController - Property binding controller wrapper.
 * Provides object-property binding for Goo controls.
 * @module goobits/controller/GooController
 */

import './GooController.css'

import type { GooSelectMenuOptions } from '../select/types.ts'
import { createSliderPrimitiveField } from '../slider/_createSliderPrimitiveField.ts'
import type { GooSliderPreset, GooSliderShape } from '../slider/types.ts'
import { emitter } from '../support/utils/emitter.ts'
import { log } from '../support/utils/logger.ts'
import { createControlFromRegistry } from './controlFactory.ts'
import { type GooControlOptionBag, type GooControlOptions, type GooControlType, type GooControlTypeRegistry, resolveGooControlTypeConfig } from './controlRegistry.ts'
import {
	buildControlOptions,
	buildDualRangeOptions,
	detectControlType,
	type DualRangeEventData,
	type DualRangeMinMax,
	getAllOptions,
	handleDualRangeUpdate,
	humanizePropertyName,
	type StoredOptions
} from './controlSetup.ts'

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Interface for control elements created by the controller.
 * Controls may implement some or all of these methods.
 */
interface GooControlElement extends HTMLElement {
	destroy?: () => void
	getValue?: () => unknown
	setValue?: (value: unknown, options?: { silent?: boolean }) => void
	setOptions?: (options: Record<string, unknown>) => void
	disable?: () => void
	enable?: () => void
	value?: unknown
}

// ============================================================================
// Types
// ============================================================================

/**
 * State interface for GooController.
 */
export interface GooControllerState {
	disabled?: boolean

	// GooController doesn't add any additional state properties beyond disabled
	// All other properties are stored as private instance variables
}

/** Individual option in a select/button-group control */
export interface ControllerOption {
	id?: string
	value?: string | number
	label?: string
	icon?: string
	key?: string
}

/** Valid option types for select/button-group controls */
export type ControllerOptionValue = string | ControllerOption

/** Component-specific options forwarded to the mounted control. */
export type GooControllerControlOptions = GooControlOptionBag

/** Built-in or host-registered Goo controller control id. */
export type GooControllerControlType = GooControlType

/** Object/property pair bound by a Goo controller. */
export interface GooControllerBinding {
	object: Record<string, unknown> | undefined
	property: string | undefined
}

/** Event names emitted through the Goo controller handle API. */
export type GooControllerEventName = 'change' | 'input'

/** Detail emitted when a controller commits a value change. */
export interface GooControllerChangeDetail {
	value: unknown
	oldValue?: unknown
	target: GooController
}

/** Detail emitted while a controller value is changing. */
export interface GooControllerInputDetail {
	value: unknown
	target: GooController
}

/** Detail shape for a Goo controller event name. */
export type GooControllerEventDetail<EventName extends GooControllerEventName = GooControllerEventName> =
	EventName extends 'change' ? GooControllerChangeDetail : GooControllerInputDetail

/**
 * Options for creating a GooController instance.
 */
export interface GooControllerOptions {
	object?: Record<string, unknown>
	property?: string
	min?: number
	max?: number
	step?: number
	options?: ControllerOptionValue[]
	type?: GooControllerControlType
	onchange?: (value: unknown) => void
	oninput?: (value: unknown) => void
	parentElement?: HTMLElement
	label?: string
	inputId?: string
	name?: string
	unit?: string
	preset?: GooSliderPreset
	presetColor?: string
	presetHue?: number
	menu?: GooSelectMenuOptions
	shape?: GooSliderShape
	coverage?: boolean
	showCoverage?: boolean
	disabled?: boolean
	className?: string
	controlOptions?: GooControllerControlOptions

	/** Layout mode: 'inline' (default) or 'stacked' (label row + control row) */
	layout?: 'inline' | 'stacked'

	/** Optional control type registry override */
	controlTypes?: GooControlTypeRegistry
}

// ============================================================================
// GooController Controller
// ============================================================================

/**
 * Public controller element returned by `createGooController`.
 */
export interface GooController extends HTMLElement {
	/** Return the current object/property binding. */
	getBinding(): GooControllerBinding
	/** Return the mounted inner control element, if any. */
	getControlElement(): HTMLElement | null
	/** Whether the controller is disabled. */
	isDisabled(): boolean
	/** Set the visible controller label. */
	name(label: string): GooController
	/** Set the numeric step option. */
	step(step: number): GooController
	/** Set the minimum numeric value option. */
	min(min: number): GooController
	/** Set the maximum numeric value option. */
	max(max: number): GooController
	/** Poll the bound object for external value changes. */
	listen(interval?: number): GooController
	/** Stop polling the bound object for external value changes. */
	stopListening(): GooController
	/** Sync the inner control display from the bound object. */
	refresh(): GooController
	/** Disable the controller and its inner control. */
	disable(): GooController
	/** Enable the controller and its inner control. */
	enable(): GooController
	/** Update controller options without replacing the outer element. */
	updateOptions(options: GooControllerOptions): GooController
	/** Set the bound value without emitting change/input events. */
	setValue(value: unknown): GooController
	/** Read the current bound value. */
	getValue(): unknown
	/** Append this controller to a parent, using the parent's `add` API when available. */
	addTo(parent: HTMLElement & { add?: (child: HTMLElement) => void }): GooController
	/** Destroy this controller and remove it from the DOM. */
	destroy(): void
	/** Subscribe to controller handle events. */
	on<EventName extends GooControllerEventName>(
		event: EventName,
		handler: (detail: GooControllerEventDetail<EventName>) => void
	): () => void
	/** Remove a controller handle event subscription. */
	off<EventName extends GooControllerEventName>(
		event: EventName,
		handler: (detail: GooControllerEventDetail<EventName>) => void
	): void
}

interface GooControllerInternal extends GooController {
	state: GooControllerState
	emit: <EventName extends GooControllerEventName>(
		event: EventName,
		data: GooControllerEventDetail<EventName>
	) => void
	$widget: HTMLElement | null
	_callbacks: {
		onchange?: GooControllerOptions['onchange']
		oninput?: GooControllerOptions['oninput']
	}
	_buttonLabel: string
	_object: Record<string, unknown> | undefined
	_property: string | undefined
	_controlType: string
	_control: GooControlElement | null
	_controlToken: number
	_controlPromise: Promise<void> | null
	_listening: boolean
	_listenInterval: ReturnType<typeof setInterval> | null
	_lastValue: unknown
	_min: number | undefined
	_max: number | undefined
	_step: number | undefined
	_selectOptions: ControllerOptionValue[] | undefined
	_inputId: string | undefined
	_name: string | undefined
	_unit: string | undefined
	_preset: string | undefined
	_presetColor: string | undefined
	_presetHue: number | undefined
	_menu: GooSelectMenuOptions | undefined
	_showCoverage: boolean | undefined
	_shape: string | undefined
	_layout: 'inline' | 'stacked' | undefined
	_controlOptions: GooControllerControlOptions | undefined
	_dualRangeIsMinMax: boolean | undefined
	_controlTypes: GooControlTypeRegistry | undefined
	_getExistingControl(): HTMLElement | null
	_attachControl(control: HTMLElement): void
	_createElement(): void
	_createControl(): Promise<void>
	_createControlInner(): Promise<void>
	_getStoredOptions(): StoredOptions
	_buildDefaultOptions(value: unknown, Control: unknown): GooControlOptions
	_getAllOptions(): GooControlOptions
	_createDualRange(value: unknown): Promise<void>
	_handleDualChange(eventData: DualRangeEventData): void
	_handleDualInput(eventData: DualRangeEventData): void
	_destroyElement(): void
	_handleChange(value: unknown): void
	_handleInput(value: unknown): void
	_emitChange(value: unknown, oldValue?: unknown): void
	_emitInput(value: unknown): void
	_stopListening(): void
	_hydrateFromDOM(): void
}

/**
 * Runtime controller implementation mixed into native div elements.
 */
class GooControllerRuntime {
	/**
	 * Controllers don't participate in forms directly.
	 * @type {boolean}
	 */
	static formAssociated = false

	/**
	 * State type definitions for property reflection.
	 * @type {Object}
	 */
	static stateTypes = {
		disabled: 'boolean' as const
	}

	// --------------------------------------------------------------------------
	// Lifecycle
	// --------------------------------------------------------------------------

	/**
	 * Gets existing control.
	 */
	_getExistingControl() {
		if (!this.$widget) return null
		const control = this.$widget.children[0] as GooControlElement | undefined
		if (!control) return null
		if (this.$widget.children.length > 1) {
			this.$widget.replaceChildren(control)
		}
		this._control = control
		return control
	}

	/**
	 * Attach control.
	 *
	 * @param control - control.
	 */
	_attachControl(control: HTMLElement) {
		if (!this.$widget) return
		this._control = control as GooControlElement
		if (this.$widget.children.length !== 1 || this.$widget.children[0] !== control) {
			this.$widget.replaceChildren(control)
		}
	}

	/**
	 * Build the controller's internal DOM structure.
	 * @protected
	 */
	_createElement() {
		const { disabled } = this.state

		// Apply classes
		this.classList.add(`goo-controller--${ this._controlType }`)
		if (disabled) this.classList.add('goo-controller--disabled')
		if (this._layout === 'stacked') this.classList.add('goo-controller--stacked')

		// Set label attribute (displayed via CSS ::before for inline mode)
		const labelText = this._buttonLabel ?? this._property ?? ''
		const humanizedLabel = humanizePropertyName(labelText)
		this.setAttribute('data-label', humanizedLabel)

		// Create structure based on layout mode
		this.replaceChildren()
		if (this._layout === 'stacked') {
			// Stacked layout: header row + widget row
			const header = document.createElement('div')
			header.className = 'goo-controller__header'
			const label = document.createElement('span')
			label.className = 'goo-label'
			label.textContent = humanizedLabel
			header.appendChild(label)
			this.appendChild(header)
		} else {
			// Inline layout: label via CSS ::before + widget
		}
		const widget = document.createElement('div')
		widget.className = 'goo-controller__widget'
		this.appendChild(widget)

		// Adopt elements
		this.$widget = this.querySelector('.goo-controller__widget')

		// Create the appropriate control
		this._createControl()
	}

	/**
	 * Create the inner control based on type.
	 * Uses the control type registry for dynamic loading.
	 * @private
	 */
	async _createControl() {
		if (this._controlPromise) return this._controlPromise

		const promise = this._createControlInner()

		this._controlPromise = promise
		try {
			await promise
		} finally {
			if (this._controlPromise === promise) {
				this._controlPromise = null
			}
		}
	}

	/**
	 * Creates control inner.
	 */
	async _createControlInner() {
		const value = this._property ? this._object?.[this._property] : undefined

		// Avoid duplicate creation if a control already exists
		if (this._control && this.$widget?.contains(this._control)) return
		if (this._getExistingControl()) return

		// Special handling for dual-range (uses range control with array value)
		if (this._controlType === 'range-dual') {
			await this._createDualRange(value)
			return
		}

		const token = ++this._controlToken

		// Create from registry using factory
		const result = await createControlFromRegistry(this._controlType, {
			value,
			controllerOptions: this._getAllOptions(),
			onchange: v => this._handleChange(v),
			oninput: v => this._handleInput(v),
			buildOptions: (val, Control) => this._buildDefaultOptions(val, Control),
			controlTypes: this._controlTypes
		})

		// Check if component was destroyed during async creation
		if (!this.$widget) {
			destroyControlResult(result)
			return
		}

		// Ignore stale async results
		if (token !== this._controlToken) {
			destroyControlResult(result)
			return
		}

		if (this._getExistingControl()) return

		if (result.status === 'created') {
			this._attachControl(result.control)
		} else if (result.status === 'not_found') {
			log.warn(`Unknown control type: ${ this._controlType }`)
		}
	}

	/**
	 * Get stored options as a structured object.
	 * @private
	 */
	_getStoredOptions(): StoredOptions {
		return {
			min: this._min,
			max: this._max,
			step: this._step,
			selectOptions: this._selectOptions,
			inputId: this._inputId,
			name: this._name,
			unit: this._unit,
			preset: this._preset,
			presetColor: this._presetColor,
			presetHue: this._presetHue,
			menu: this._menu,
			showCoverage: this._showCoverage,
			buttonLabel: this._buttonLabel,
			shape: this._shape,
			layout: this._layout,
			controlOptions: this._controlOptions
		}
	}

	/**
	 * Build default options for a control based on stored options.
	 * @private
	 * @param value - value.
	 * @param _Control - control.
	 */
	_buildDefaultOptions(value: unknown, _Control: unknown) {
		return buildControlOptions(value, this._controlType, this._getStoredOptions(), {
			onchange: v => this._handleChange(v),
			oninput: v => this._handleInput(v),
			onButtonClick: () => {
				if (typeof value === 'function') {
					value.call(this._object)
				}
			}
		})
	}

	/**
	 * Get all stored options for passing to custom buildOptions.
	 * @private
	 */
	_getAllOptions() {
		return getAllOptions(this._getStoredOptions())
	}

	/**
	 * Create dual-thumb range slider for min/max pairs.
	 * @private
	 * @param value - value.
	 */
	async _createDualRange(value: unknown) {
		// Type guard to ensure value is a valid dual range format
		const isDualRangeValue = (v: unknown): v is number[] | DualRangeMinMax => {
			if (
				Array.isArray(v) &&
				v.length === 2 &&
				typeof v[0] === 'number' &&
				typeof v[1] === 'number'
			) {
				return true
			}
			if (v && typeof v === 'object' && 'min' in v && 'max' in v) {
				const obj = v as { min: unknown; max: unknown }
				return typeof obj.min === 'number' && typeof obj.max === 'number'
			}
			return false
		}

		if (!isDualRangeValue(value)) {
			return
		}

		const dualValue = value as number[] | DualRangeMinMax

		if (!this.$widget) return

		const { sliderOptions, isMinMaxFormat } = buildDualRangeOptions(
			dualValue,
			this._getStoredOptions(),
			{
				onchange: eventData => this._handleDualChange(eventData),
				oninput: eventData => this._handleDualInput(eventData)
			}
		)

		// Store format for handlers
		this._dualRangeIsMinMax = isMinMaxFormat

		this._control = createSliderPrimitiveField(sliderOptions) as GooControlElement
		this.$widget.appendChild(this._control)
	}

	/**
	 * Handle value change from dual-thumb range.
	 * @private
	 * @param eventData - event data.
	 */
	_handleDualChange(eventData: DualRangeEventData) {
		const target = this._property ? this._object?.[this._property] : undefined
		const dualTarget = target as number[] | DualRangeMinMax | null | undefined
		const emitValue = handleDualRangeUpdate(eventData, dualTarget, this._dualRangeIsMinMax!)
		this._emitChange(emitValue)
	}

	/**
	 * Handle input from dual-thumb range.
	 * @private
	 * @param eventData - event data.
	 */
	_handleDualInput(eventData: DualRangeEventData) {
		const target = this._property ? this._object?.[this._property] : undefined
		const dualTarget = target as number[] | DualRangeMinMax | null | undefined
		const emitValue = handleDualRangeUpdate(eventData, dualTarget, this._dualRangeIsMinMax!)
		this._emitInput(emitValue)
	}

	/**
	 * Clean up when element is removed from DOM.
	 * @protected
	 */
	_destroyElement() {
		this._stopListening()
		this._control?.destroy?.()
		this.$widget = null
		this._control = null
		this._controlToken += 1
		this._controlPromise = null
	}

	// --------------------------------------------------------------------------
	// Event Handling
	// --------------------------------------------------------------------------

	/**
	 * Handle value change (committed value).
	 * @param value - The new value
	 * @private
	 */
	_handleChange(value: unknown) {
		if (this._object && this._property) {
			this._object[this._property] = value
		}
		this._emitChange(value)
	}

	/**
	 * Handle input (value changing, not yet committed).
	 * @param value - The new value
	 * @private
	 */
	_handleInput(value: unknown) {
		if (this._object && this._property) {
			this._object[this._property] = value
		}
		this._emitInput(value)
	}

	/**
	 * Emit change.
	 *
	 * @param value - value.
	 * @param oldValue - old value.
	 */
	_emitChange(value: unknown, oldValue?: unknown) {
		const detail: GooControllerChangeDetail = { value, oldValue, target: this }
		this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true }))
		this.emit('change', detail)
		this._callbacks.onchange?.(value)
	}

	/**
	 * Emit input.
	 *
	 * @param value - value.
	 */
	_emitInput(value: unknown) {
		const detail: GooControllerInputDetail = { value, target: this }
		this.dispatchEvent(new CustomEvent('input', { detail, bubbles: true }))
		this.emit('input', detail)
		this._callbacks.oninput?.(value)
	}

	// --------------------------------------------------------------------------
	// Public API (Chainable)
	// --------------------------------------------------------------------------

	/**
	 * Current value.
	 * @type {*}
	 */
	get value() {
		return this._property ? this._object?.[this._property] : undefined
	}

	/**
	 * Value.
	 *
	 * @param val - val.
	 */
	set value(val) {
		if (this._object && this._property) {
			this._object[this._property] = val
		}
		this.refresh()
	}

	/**
	 * The bound object.
	 * @type {Object}
	 */
	get object() {
		return this._object
	}

	/**
	 * The bound property name.
	 * @type {string}
	 */
	get property() {
		return this._property
	}

	/**
	 * The inner control element.
	 * @type {HTMLElement}
	 */
	get control() {
		return this._control
	}

	/**
	 * Return the current object/property binding.
	 */
	getBinding() {
		return {
			object: this._object,
			property: this._property
		}
	}

	/**
	 * Return the mounted inner control element.
	 */
	getControlElement() {
		return this._control
	}

	/**
	 * Whether the controller is disabled.
	 */
	isDisabled() {
		return Boolean(this.state.disabled)
	}

	/**
	 * Set the display label for this controller.
	 * @param label - New label text
	 * @returns this (for chaining)
	 */
	name(label: string) {
		this._buttonLabel = label

		// Update the data-label attribute (displayed via CSS ::before)
		this.setAttribute('data-label', label)

		// For button controls, also update the button text
		if (this._controlType === 'button' && this._control) {
			this._control.setValue?.(label)
		}
		return this
	}

	/**
	 * Set the step increment.
	 * @param step - Step value
	 * @returns this (for chaining)
	 */
	step(step: number) {
		this._step = step
		if (this._control?.setOptions) {
			this._control.setOptions({ step })
		}
		return this
	}

	/**
	 * Set min value.
	 * @param min - Minimum value
	 * @returns this (for chaining)
	 */
	min(min: number) {
		this._min = min
		if (this._control?.setOptions) {
			this._control.setOptions({ min })
		}
		return this
	}

	/**
	 * Set max value.
	 * @param max - Maximum value
	 * @returns this (for chaining)
	 */
	max(max: number) {
		this._max = max
		if (this._control?.setOptions) {
			this._control.setOptions({ max })
		}
		return this
	}

	/**
	 * Enable listening mode - polls object property and updates display.
	 * @param {number} [interval=100] - Poll interval in ms
	 * @returns {GooController} this (for chaining)
	 */
	listen(interval = 100) {
		if (this._listening) return this

		this._listening = true
		this._lastValue = this.value

		this._listenInterval = setInterval(() => {
			const currentValue = this._property ? this._object?.[this._property] : undefined
			if (currentValue !== this._lastValue) {
				this._lastValue = currentValue
				this.refresh()
			}
		}, interval)

		return this
	}

	/**
	 * Stop listening for external changes.
	 * @returns {GooController} this (for chaining)
	 */
	stopListening() {
		this._stopListening()
		return this
	}

	/**
	 * Internal stop listening.
	 * @private
	 */
	_stopListening() {
		if (this._listenInterval) {
			clearInterval(this._listenInterval)
			this._listenInterval = null
		}
		this._listening = false
	}

	/**
	 * Update the control's display to match the object property.
	 * @returns {GooController} this (for chaining)
	 */
	refresh() {
		const value = this._property ? this._object?.[this._property] : undefined

		if (this._control) {
			const hasReadableValue =
				typeof this._control.getValue === 'function' || 'value' in this._control
			const displayedValue =
				typeof this._control.getValue === 'function'
					? this._control.getValue()
					: this._control.value
			if (hasReadableValue && Object.is(displayedValue, value)) return this

			if (this._control.setValue) {
				this._control.setValue(value, { silent: true })
			} else if ('value' in this._control) {
				this._control.value = value
			}
		}

		return this
	}

	/**
	 * Disable the controller.
	 * @returns {GooController} this (for chaining)
	 */
	disable() {
		this.state.disabled = true
		this.classList.add('goo-controller--disabled')
		this.setAttribute('aria-disabled', 'true')
		if (this._control?.disable) {
			this._control.disable()
		}
		return this
	}

	/**
	 * Enable the controller.
	 * @returns {GooController} this (for chaining)
	 */
	enable() {
		this.state.disabled = false
		this.classList.remove('goo-controller--disabled')
		this.removeAttribute('aria-disabled')
		if (this._control?.enable) {
			this._control.enable()
		}
		return this
	}

	/**
	 * Update controller options without replacing the controller element.
	 * Rebuilds the inner control only when the bound identity or control type changes.
	 * @param options - Next controller options
	 * @returns this (for chaining)
	 */
	updateOptions(options: GooControllerOptions) {
		const { object, property } = options
		const nextValue = property === undefined ? undefined : object?.[property]
		const nextControlType = detectControlType(nextValue, options)
		const nextLayout = resolveControllerLayout(nextControlType, options)
		const controlIdentityChanged =
			nextControlType !== this._controlType ||
			object !== this._object ||
			property !== this._property ||
			options.controlTypes !== this._controlTypes ||
			nextLayout !== this._layout

		if (controlIdentityChanged) {
			this._destroyElement()
			this.className = 'goo-controller'
			initializeController(this, options)
			this._createElement()
			return this
		}

		this._callbacks.onchange = options.onchange
		this._callbacks.oninput = options.oninput
		this._object = object
		this._property = property
		this._min = options.min
		this._max = options.max
		this._step = options.step
		this._selectOptions = options.options
		this._inputId = options.inputId
		this._name = options.name
		this._unit = options.unit
		this._preset = options.preset
		this._presetColor = options.presetColor
		this._presetHue = options.presetHue
		this._menu = options.menu
		this._showCoverage = options.coverage ?? options.showCoverage
		this._shape = options.shape
		this._controlOptions = extractControlOptions(options)

		if (Array.isArray(options.min)) {
			this._selectOptions = options.min
			this._min = undefined
		}

		const label = options.label ?? property ?? ''
		if (label !== this._buttonLabel) {
			this.name(label)
		}

		if (options.disabled) {
			this.disable()
		} else {
			this.enable()
		}

		this._control?.setOptions?.(this._getAllOptions())
		this.refresh()
		return this
	}

	/**
	 * Set value programmatically.
	 * @param value - New value
	 * @returns this (for chaining)
	 */
	setValue(value: unknown) {
		if (this._object && this._property) {
			this._object[this._property] = value
		}
		this.refresh()
		return this
	}

	/**
	 * Get current value.
	 * @returns The current value
	 */
	getValue(): unknown {
		return this._property ? this._object?.[this._property] : undefined
	}

	/**
	 * Add this controller to a parent element.
	 * @param parent - Parent element (GooFolder, GooPanel, etc.)
	 * @returns this (for chaining)
	 */
	addTo(parent: HTMLElement & { add?: (child: HTMLElement) => void }) {
		if (parent) {
			// Use add() method if available (GooPanel/GooFolder)
			if (typeof parent.add === 'function') {
				parent.add(this)
			} else if (parent.appendChild) {
				parent.appendChild(this)
			}
		}
		return this
	}

	/**
	 * Destroy.
	 */
	destroy() {
		this._destroyElement()
		this.remove()
	}

	// --------------------------------------------------------------------------
	// SSR Support
	// --------------------------------------------------------------------------

	/**
	 * Generate SSR-safe HTML template.
	 * Note: Controllers are typically created client-side, but this enables SSR.
	 * @param {Object} [options={}]
	 * @returns {string} HTML string
	 * @static
	 * @param type - type.
	 * @param className - class name.
	 */
	static ssrTemplate({ type = 'text', className = '' } = {}) {
		const classes = [ 'goo-controller', `goo-controller--${ type }` ]
		if (className) classes.push(...className.split(' ').filter(Boolean))

		return `<div class="${ classes.join(' ') }" data-ssr>
			<div class="goo-controller__widget"></div>
		</div>`
	}

	/**
	 * Hydrate from pre-rendered SSR DOM.
	 * @protected
	 */
	_hydrateFromDOM() {
		this.$widget = this.querySelector('.goo-controller__widget')

		// Remove SSR marker
		this.removeAttribute('data-ssr')

		// Reconnect: reuse existing control if present to avoid duplicates
		if (this.$widget?.children?.length) {
			this._controlToken += 1
			this._getExistingControl()
			return
		}

		// Create control (SSR or empty widget)
		this._createControl()
	}
}

function destroyControlResult(result: Awaited<ReturnType<typeof createControlFromRegistry>>): void {
	if (result.status === 'created') {
		(result.control as GooControlElement).destroy?.()
	}
}

interface GooControllerRuntime extends GooControllerInternal {}

/**
 * Create a Goo controller element.
 * @param options - Controller options.
 * @returns The created controller element.
 */
function GooControllerElement(options: GooControllerOptions = {}): GooController {
	return createControllerElement(options)
}

Object.defineProperties(GooControllerElement, {
	formAssociated: {
		configurable: true,
		value: GooControllerRuntime.formAssociated
	},
	stateTypes: {
		configurable: true,
		value: GooControllerRuntime.stateTypes
	},
	ssrTemplate: {
		configurable: true,
		value: GooControllerRuntime.ssrTemplate
	}
})

const runtimeDescriptors = Object.getOwnPropertyDescriptors(GooControllerRuntime.prototype)
Reflect.deleteProperty(runtimeDescriptors, 'constructor')
Object.defineProperties(GooControllerElement.prototype, runtimeDescriptors)

// ============================================================================
// Factory & Export
// ============================================================================

function initializeController(element: GooControllerInternal, options: GooControllerOptions): void {
	const { object, property } = options
	const initialValue = property === undefined ? undefined : object?.[property]
	const controlType = detectControlType(initialValue, options)
	const layout = resolveControllerLayout(controlType, options)

	element.state = { disabled: !!options.disabled }
	element._callbacks = {
		onchange: options.onchange,
		oninput: options.oninput
	}
	element._buttonLabel = options.label ?? property ?? ''
	element._object = object
	element._property = property
	element._controlType = controlType
	element._control = null
	element._controlToken = 0
	element._controlPromise = null
	element._listening = false
	element._listenInterval = null
	element._min = options.min
	element._max = options.max
	element._step = options.step
	element._selectOptions = options.options
	element._inputId = options.inputId
	element._name = options.name
	element._unit = options.unit
	element._preset = options.preset
	element._presetColor = options.presetColor
	element._presetHue = options.presetHue
	element._menu = options.menu
	element._showCoverage = options.coverage ?? options.showCoverage
	element._shape = options.shape
	element._layout = layout
	element._controlOptions = extractControlOptions(options)
	element._controlTypes = options.controlTypes

	if (Array.isArray(options.min)) {
		element._selectOptions = options.min
		element._min = undefined
	}
	if (options.className) {
		element.classList.add(...options.className.split(' ').filter(Boolean))
	}
}

function extractControlOptions(options: GooControllerOptions): GooControllerControlOptions | undefined {
	return options.controlOptions ? { ...options.controlOptions } : undefined
}

function resolveControllerLayout(
	controlType: string,
	options: GooControllerOptions
): 'inline' | 'stacked' | undefined {
	return options.layout ?? resolveGooControlTypeConfig(controlType, options.controlTypes)?.layout
}

function attachControllerMethods(element: GooControllerInternal): void {
	const nativePrototype = Object.getPrototypeOf(element)
	if (Object.getPrototypeOf(GooControllerElement.prototype) !== nativePrototype) {
		Object.setPrototypeOf(GooControllerElement.prototype, nativePrototype)
	}
	Object.setPrototypeOf(element, GooControllerElement.prototype)
	emitter(element)
}

function createControllerElement(options: GooControllerOptions = {}): GooController {
	const element = document.createElement('div') as unknown as GooControllerInternal
	element.className = 'goo-controller'
	element.$widget = null
	attachControllerMethods(element)
	initializeController(element, options)
	element._createElement()
	if (options.parentElement) {
		options.parentElement.appendChild(element)
	}
	return element
}

/**
 * Add a controller to an object property.
 * Supports multiple calling conventions:
 *   createGooController(object, 'property')
 *   createGooController(object, 'property', { min, max, step })
 *   createGooController(object, 'property', { options: [...] })
 *   createGooController(object, 'property', { type: 'color' })
 *   createGooController({ object, property, ... })
 *
 * @param objectOrOptions - Object to bind, or options object
 * @param property - Property name (if first arg is object)
 * @param options - Additional options (min, max, step, options, type)
 * @returns The created controller instance
 */
export function createGooController(
	objectOrOptions: Record<string, unknown> | GooControllerOptions,
	property?: string,
	options: Partial<GooControllerOptions> = {}
): GooController {
	// If called with options object directly
	if (
		property === undefined &&
		typeof objectOrOptions === 'object' &&
		'property' in objectOrOptions
	) {
		return createControllerElement(objectOrOptions as GooControllerOptions)
	}

	// Called with (object, property, options)
	const mergedOptions: GooControllerOptions = {
		object: objectOrOptions as Record<string, unknown>,
		property,
		...options
	}

	return createControllerElement(mergedOptions)
}
