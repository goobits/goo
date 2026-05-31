/// <reference path="../svelte.d.ts" />

import { flushSync, mount, unmount } from 'svelte'

import { clampProgress } from './_progressRingRenderer.ts'
import GooProgressRingComponent from './GooProgressRing.svelte'
import type {
	GooProgressRingHandle,
	GooProgressRingSteps,
	GooProgressRingTimer,
	GooProgressRingTimerOptions,
	GooProgressRingVariant
} from './types.ts'

export { default as GooProgressRing } from './GooProgressRing.svelte'
export type {
	GooProgressRingHandle,
	GooProgressRingSteps,
	GooProgressRingTimer,
	GooProgressRingTimerOptions,
	GooProgressRingTimerType,
	GooProgressRingVariant
} from './types.ts'

/**
 * Create a Goo progress-ring timer controller.
 *
 * @param options - Timer options.
 * @returns Progress-ring timer controller.
 */
export function createGooProgressRingTimer(options: GooProgressRingTimerOptions = {}): GooProgressRingTimer {
	const {
		indeterminate = false,
		parentNode,
		range = [ 0, 1 ],
		showBackdrop = true,
		showText = true,
		size = 120,
		type = 'progress',
		useAutoHide = true
	} = options
	const parent = resolveParent(parentNode)
	const shell = document.createElement('div')
	shell.className = 'goo-progress-ring-timer'
	const timer = {} as GooProgressRingTimer & { visible: boolean }

	let progress = Number.isFinite(options.progress) ? clampProgress(options.progress as number) : 0
	let indeterminateState = indeterminate
	let stepIndex = 0
	let steps = normalizeSteps(options.steps)
	let timeStart = Date.now()
	let rafId = 0
	let hideTimerId = 0
	let destroyed = false

	shell.dataset.backdrop = String(showBackdrop)
	shell.classList.toggle('backdrop', showBackdrop)
	shell.style.setProperty('--goo-progress-ring-size', `${ size }px`)

	// Svelte's mount() does not surface a component's exported functions in its
	// return type, so annotate the imperative handle the component exposes.
	const ring = mount(GooProgressRingComponent, { target: shell }) as GooProgressRingHandle
	parent.append(shell)

	// Flush so the component's bind:this refs are set before we drive it imperatively.
	flushSync()

	const variant = resolveVariant(options, shell)
	ring.configure({
		colorStops: options.colorStops,
		fillStyle: options.fillStyle,
		indeterminate,
		rotationSpeed: options.rotationSpeed,
		showText,
		spinnerDuration: options.spinnerDuration,
		transitionSpeed: options.transitionSpeed,
		variant
	})

	Object.defineProperties(timer, {
		$element: { value: shell },
		canvas: { get() { return ring.getCanvas() } },
		duration: {
			get() {
				return getDuration()
			}
		},
		indeterminate: {
			get() {
				return indeterminateState
			},
			set(value: boolean) {
				setIndeterminate(value)
			}
		},
		progress: {
			get() {
				return progress
			},
			set(value: number) {
				setProgress(value)
			}
		},
		ring: { value: ring },
		stepIndex: {
			get() {
				return stepIndex
			}
		},
		steps: {
			get() {
				return steps ? [ ...steps ] : null
			},
			set(value: GooProgressRingSteps | null) {
				steps = normalizeSteps(value ?? undefined)
				stepIndex = Math.min(stepIndex, Math.max(0, (steps?.length ?? 1) - 1))
				renderOnce()
			}
		},
		totalProgress: {
			get() {
				return getTotalProgress()
			}
		}
	})

	shell.addEventListener('touchdown', cancelEvent)
	shell.addEventListener('mousedown', cancelEvent)

	timer.visible = false
	timer.advance = advance
	timer.destroy = destroy
	timer.hide = hide
	timer.setProgress = setProgress
	timer.show = show

	renderOnce()

	if (Number.isFinite(options.progress) || indeterminate) {
		show()
	} else {
		hide({ immediate: true })
	}

	return timer

	function destroy(duration?: number): void {
		if (destroyed) {
			return
		}

		destroyed = true
		stopRenderLoop()
		window.clearTimeout(hideTimerId)

		const teardown = () => {
			unmount(ring)
			shell.remove()
		}

		if (duration && duration > 0) {
			shell.style.transition = `opacity ${ duration }ms`
			shell.dataset.visible = 'false'
			window.setTimeout(teardown, duration)
			return
		}

		teardown()
	}

	function hide({ immediate = false }: { immediate?: boolean } = {}): void {
		if (!timer.visible && shell.style.visibility === 'hidden') {
			return
		}

		timer.visible = false
		shell.dataset.visible = 'false'
		shell.dataset.cover = 'false'
		shell.classList.remove('visible')
		shell.style.pointerEvents = 'none'
		stopRenderLoop()
		window.clearTimeout(hideTimerId)

		if (immediate) {
			hideElement()
		} else {
			hideTimerId = window.setTimeout(hideElement, 500)
		}
	}

	function show(view?: 'cover'): void {
		timer.visible = true
		shell.dataset.visible = 'true'
		shell.dataset.cover = String(view === 'cover')
		shell.classList.add('visible')
		shell.style.pointerEvents = ''
		shell.style.visibility = ''
		timeStart = Date.now()
		startRenderLoop()
	}

	function setProgress(value: number): void {
		if (!Number.isFinite(value)) {
			return
		}

		progress = clampProgress(value)
		if (type === 'time') {
			timeStart = Date.now() - getDuration() * getTotalProgress() * 1000
		}

		show()
		renderOnce()
	}

	function advance(): void {
		if (!steps) {
			setProgress(1)
			return
		}

		if (stepIndex < steps.length - 1) {
			stepIndex += 1
			progress = 0
		} else {
			progress = 1
		}

		show()
		renderOnce()
	}

	function setIndeterminate(indeterminate: boolean): void {
		indeterminateState = indeterminate
		ring.setIndeterminate(indeterminate)
		if (indeterminate) {
			show()
		} else {
			renderOnce()
		}
	}

	function renderOnce(): { format: string; percent: number; value: number | string } {
		const display = getDisplayObject()
		ring.setProgress(display.percent, display)
		if (display.percent >= 1 && useAutoHide) {
			hide()
		}
		return display
	}

	function startRenderLoop(): void {
		if (rafId || destroyed) {
			return
		}

		const frame = () => {
			rafId = window.requestAnimationFrame(frame)
			if (type === 'time') {
				renderOnce()
			}
		}
		rafId = window.requestAnimationFrame(frame)
	}

	function stopRenderLoop(): void {
		window.cancelAnimationFrame(rafId)
		rafId = 0
	}

	function hideElement(): void {
		if (!timer.visible) {
			shell.style.visibility = 'hidden'
		}
	}

	function getDisplayObject(): { format: string; percent: number; value: number | string } {
		if (type !== 'time') {
			const totalProgress = getTotalProgress()
			return {
				format: 'PERCENT',
				percent: totalProgress,
				value: Math.ceil(totalProgress * 100)
			}
		}

		const duration = getDuration()
		const elapsed = (Date.now() - timeStart) / 1000
		const percent = clampProgress(elapsed / duration)
		const [ start, end ] = range
		const countDown = start > end
		const deltaTime = countDown
			? duration - elapsed + end
			: elapsed + start
		const time = Math.max(0, Math.min(Math.max(start, end), Math.round(deltaTime)))
		const hours = Math.floor(time / 3600)
		const minutes = Math.floor((time - hours * 3600) / 60)
		let seconds: number | string = time - hours * 3600 - minutes * 60
		if (seconds < 10 && minutes) {
			seconds = `0${ seconds }`
		}

		if (minutes) {
			return {
				format: minutes === 1 ? 'MINUTE' : 'MINUTES',
				percent,
				value: minutes
			}
		}

		return {
			format: seconds === 1 ? 'SECOND' : 'SECONDS',
			percent,
			value: seconds
		}
	}

	function getDuration(): number {
		const [ start, end ] = range
		return Math.abs(end - start) || 1
	}

	function getTotalProgress(): number {
		if (!steps) {
			return progress
		}

		const completed = steps
			.slice(0, stepIndex)
			.reduce((sum, step) => sum + step, 0)
		return clampProgress(completed + progress * steps[stepIndex])
	}
}

function resolveParent(parentNode: Element | string | null | undefined): Element {
	if (typeof parentNode === 'string') {
		return document.querySelector(parentNode) ?? document.body
	}
	return parentNode ?? document.body
}

function cancelEvent(domEvent: Event): void {
	domEvent.preventDefault()
	domEvent.stopPropagation()
}

function normalizeSteps(steps?: GooProgressRingSteps): number[] | null {
	if (typeof steps === 'number') {
		if (!Number.isInteger(steps) || steps < 1) {
			return null
		}

		return Array.from({ length: steps }, () => 1 / steps)
	}

	if (!Array.isArray(steps) || !steps.length) {
		return null
	}

	const validSteps = steps.filter(step => Number.isFinite(step) && step > 0)
	const total = validSteps.reduce((sum, step) => sum + step, 0)
	if (!total) {
		return null
	}

	return validSteps.map(step => step / total)
}

function resolveVariant(options: GooProgressRingTimerOptions, shell: HTMLElement): GooProgressRingVariant {
	const explicit = options.variant ?? options.renderer
	if (explicit) {
		return explicit
	}

	const themed = window.getComputedStyle(shell).getPropertyValue('--goo-progress-ring-variant').trim()
	return themed === 'rainbow' ? 'rainbow' : 'basic'
}
