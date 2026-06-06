import { createGooTooltip, type GooTooltipInstance } from './tooltip.ts'

type TooltipContent = string | HTMLElement | (() => string | HTMLElement | null | undefined)

/** Options accepted by the imperative Goo tooltip runtime. */
export interface GooTooltipRuntimeOptions {
	autoHide?: number
	className?: string
	direction?: 'top' | 'right' | 'bottom' | 'left'
	element?: HTMLElement
	event?: Event
	interactive?: boolean
	offset?: number | { x?: number; y?: number }
	position?: 'auto' | { x: number; y: number }
	showDelay?: number
	showOnClick?: boolean
	showOnHover?: boolean
}

/** Handle returned by the imperative Goo tooltip runtime. */
export interface GooTooltipRuntimeHandle {
	/** Element the tooltip is attached to. */
	readonly element: HTMLElement
	/** Destroy this tooltip handle. */
	destroy(): void
	/** Hide this tooltip when it is active. */
	hide(): void
	/** Show or refresh this tooltip. */
	show(): void
}

/** Imperative Goo tooltip manager for Sketch-style non-Svelte call sites. */
export interface GooTooltipRuntimeApi {
	/** Attach a tooltip to an element and return the runtime state for manual control. */
	attach(element: HTMLElement | string, content: TooltipContent, options?: GooTooltipRuntimeOptions): GooTooltipRuntimeHandle | undefined
	/** Destroy the active tooltip and remove any synthetic anchor. */
	destroy(): void
	/** Whether an imperative tooltip is currently visible. */
	readonly enabled: boolean
	/** Hide the active tooltip. */
	hide(callback?: () => void): void
	/** Re-show the active or provided tooltip state when enabled. */
	ping(handle?: GooTooltipRuntimeHandle): void
	/** Show a tooltip state or ad-hoc tooltip content. */
	show(content: TooltipContent | GooTooltipRuntimeHandle, options?: GooTooltipRuntimeOptions): void
}

type TooltipState = {
	content: TooltipContent
	element: HTMLElement
	instance: GooTooltipInstance
	options: GooTooltipRuntimeOptions
}

type TooltipRuntimeHandleInternal = GooTooltipRuntimeHandle & {
	readonly state: TooltipState
}

let currentState: TooltipState | undefined
let currentInstance: GooTooltipInstance | undefined
let anchor: HTMLElement | undefined
let enabled = false
let showTimeoutId = 0
let hideTimeoutId = 0

/** Imperative Goo tooltip runtime used by Sketch-style non-Svelte call sites. */
export const gooTooltipRuntime: GooTooltipRuntimeApi = {
	attach: attachTooltip,
	destroy,
	get enabled() {
		return enabled
	},
	hide,
	ping,
	show
}

function attachTooltip(
	element: HTMLElement | string,
	content: TooltipContent,
	options: GooTooltipRuntimeOptions = {}
): GooTooltipRuntimeHandle | undefined {
	const target = resolveElement(element)
	const value = resolveContent(content)
	if (!target || !value) return undefined

	const instance = createGooTooltip({
		for: target,
		content: typeof value === 'string' ? value : '',
		contentElement: value instanceof HTMLElement ? value : undefined,
		align: alignFromDirection(options.direction),
		offset: normalizeOffset(options.offset),
		showDelay: options.showDelay ?? 0,
		trigger: resolveTrigger(options),
		interactive: options.interactive
	})
	const state: TooltipState = {
		content,
		element: target,
		instance,
		options
	}

	return createHandle(state)
}

function show(
	content: TooltipContent | GooTooltipRuntimeHandle,
	options: GooTooltipRuntimeOptions = {}
): void {
	let state: TooltipState
	if (isTooltipHandle(content)) {
		state = content.state
	} else {
		state = createShowState(content as TooltipContent, options)
	}
	const value = resolveContent(state.content)
	if (!value) return

	clearTimeout(showTimeoutId)
	clearTimeout(hideTimeoutId)

	const delay = state.options.showDelay ?? options.showDelay ?? 0
	if (delay > 0) {
		showTimeoutId = window.setTimeout(() => {
			show(createHandle({
				...state,
				options: {
					...state.options,
					showDelay: 0
				}
			}))
		}, delay)
		return
	}

	currentInstance?.hide()
	currentState = state
	currentInstance = state.instance
	state.instance.setContent(value)
	state.instance.show()
	enabled = true

	if (state.options.autoHide) {
		hideTimeoutId = window.setTimeout(() => hide(), state.options.autoHide)
	}
}

function hide(callback?: () => void): void {
	clearTimeout(showTimeoutId)
	clearTimeout(hideTimeoutId)
	currentInstance?.hide()
	enabled = false
	callback?.()
}

function ping(handle?: GooTooltipRuntimeHandle): void {
	const state = handle && isTooltipHandle(handle) ? handle.state : currentState
	if (!state || !enabled) return
	show(createHandle(state))
}

function destroy(): void {
	clearTimeout(showTimeoutId)
	clearTimeout(hideTimeoutId)
	currentInstance?.destroy()
	currentInstance = undefined
	currentState = undefined
	anchor?.remove()
	anchor = undefined
	enabled = false
}

function createShowState(content: TooltipContent, options: GooTooltipRuntimeOptions): TooltipState {
	const target = options.element || resolveAnchor(options)
	const instance = createGooTooltip({
		for: target,
		content: '',
		align: alignFromDirection(options.direction),
		offset: normalizeOffset(options.offset),
		trigger: 'manual',
		interactive: options.interactive
	})

	return {
		content,
		element: target,
		instance,
		options
	}
}

function createHandle(state: TooltipState): TooltipRuntimeHandleInternal {
	return {
		get element() {
			return state.element
		},
		get state() {
			return state
		},
		destroy() {
			state.instance.destroy()
			if (currentState === state) {
				currentState = undefined
				currentInstance = undefined
				enabled = false
			}
		},
		hide() {
			if (currentState === state) {
				hide()
			} else {
				state.instance.hide()
			}
		},
		show() {
			show(this)
		}
	}
}

function resolveAnchor(options: GooTooltipRuntimeOptions): HTMLElement {
	const point = resolvePoint(options)
	if (!anchor) {
		anchor = document.createElement('span')
		anchor.style.position = 'fixed'
		anchor.style.width = '1px'
		anchor.style.height = '1px'
		anchor.style.pointerEvents = 'none'
		document.body.append(anchor)
	}

	anchor.style.left = `${ point.x }px`
	anchor.style.top = `${ point.y }px`
	return anchor
}

function resolvePoint(options: GooTooltipRuntimeOptions): { x: number; y: number } {
	if (options.position && typeof options.position === 'object') {
		return options.position
	}

	const event = options.event
	if (event && 'clientX' in event && 'clientY' in event) {
		return {
			x: Number(event.clientX),
			y: Number(event.clientY)
		}
	}

	return {
		x: window.innerWidth / 2,
		y: window.innerHeight / 2
	}
}

function resolveElement(element: HTMLElement | string): HTMLElement | undefined {
	if (typeof element !== 'string') return element
	return document.querySelector(element) ?? undefined
}

function resolveContent(content: TooltipContent): string | HTMLElement | undefined {
	const value = typeof content === 'function' ? content() : content
	if (value === null || value === undefined || value === '') return undefined
	return value
}

function resolveTrigger(options: GooTooltipRuntimeOptions): 'hover' | 'focus' | 'both' | 'manual' {
	if (options.showOnClick && !options.showOnHover) return 'manual'
	if (options.showOnHover === false) return 'focus'
	return 'both'
}

function normalizeOffset(offset: GooTooltipRuntimeOptions['offset']): { x?: number; y?: number } {
	if (typeof offset === 'number') {
		return {
			x: offset,
			y: offset
		}
	}

	return offset ?? { x: 0, y: 8 }
}

function alignFromDirection(direction: GooTooltipRuntimeOptions['direction'] = 'top'): string {
	switch (direction) {
		case 'bottom':
			return 'center top to center bottom'
		case 'left':
			return 'center right to center left'
		case 'right':
			return 'center left to center right'
		default:
			return 'center bottom to center top'
	}
}

function isTooltipHandle(value: TooltipContent | GooTooltipRuntimeHandle): value is TooltipRuntimeHandleInternal {
	return typeof value === 'object' && value !== null && 'state' in value
}
