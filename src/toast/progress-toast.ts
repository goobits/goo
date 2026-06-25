import './GooProgressToast.css'

import { mount, unmount } from 'svelte'

import GooProgressRing from '../progress-ring/GooProgressRing.svelte'

type ProgressToastContent = string | HTMLElement | { icon?: string; label?: string }

/** Options for an imperative Goo progress toast. */
export interface GooProgressToastOptions {
	cancelButton?: ProgressToastContent
	closeDelay?: number
	dataset?: Record<string, string>
	messages?: {
		canceled?: ProgressToastContent
		completed?: ProgressToastContent
		error?: ProgressToastContent
		inProgress?: ProgressToastContent
	}
}

/** Imperative progress toast handle. */
export type GooProgressToastHandle = {
	readonly element: HTMLElement
	cancel(): void
	complete(): void
	destroy(): void
	error(): void
	setMessage(message: string): void
	setProgress(value: number): void
}

const PHASES = {
	canceled: 'canceled',
	completed: 'completed',
	error: 'error',
	inProgress: 'inProgress'
} as const
type ProgressToastPhase = typeof PHASES[keyof typeof PHASES]
type ProgressToastMessages = Record<ProgressToastPhase, ProgressToastContent>

/** Creates an imperative Goo progress toast. */
export function createGooProgressToast({
	cancelButton,
	closeDelay = 2500,
	dataset = {},
	messages = {}
}: GooProgressToastOptions = {}): GooProgressToastHandle {
	const resolvedMessages: ProgressToastMessages = {
		canceled: messages.canceled ?? 'Operation canceled.',
		completed: messages.completed ?? 'Operation completed.',
		error: messages.error ?? 'Operation failed.',
		inProgress: messages.inProgress ?? 'Operation in progress.'
	}
	const state: { phase: ProgressToastPhase; progress: number } = { phase: PHASES.inProgress, progress: 0 }
	const toast = document.createElement('div')
	const status = document.createElement('p')
	const ringHost = document.createElement('div')
	const cancel = document.createElement('button')
	const ring = mount(GooProgressRing, { target: ringHost }) as { setProgress(value: number): void }
	let closeTimer: number | undefined
	let destroyed = false

	toast.className = 'goo-progress-toast'
	toast.dataset.phase = state.phase
	for (const [ key, value ] of Object.entries(dataset)) {
		toast.dataset[key] = value
	}

	status.className = 'goo-progress-toast__status'
	ringHost.className = 'goo-progress-toast__ring'
	cancel.className = 'goo-progress-toast__cancel'
	cancel.type = 'button'

	toast.append(status, ringHost, cancel)
	document.body.append(toast)

	const handle: GooProgressToastHandle = {
		get element() {
			return toast
		},
		cancel() {
			if (destroyed) return
			if (setPhase(PHASES.canceled)) {
				toast.dispatchEvent(new CustomEvent('cancel'))
				scheduleClose()
			}
		},
		complete() {
			if (destroyed) return
			if (setPhase(PHASES.completed)) {
				toast.dispatchEvent(new CustomEvent('complete'))
				scheduleClose()
			}
		},
		destroy() {
			destroy()
		},
		error() {
			if (destroyed) return
			if (setPhase(PHASES.error)) {
				toast.dispatchEvent(new CustomEvent('error'))
				scheduleClose()
			}
		},
		setMessage(message) {
			if (destroyed) return
			resolvedMessages[state.phase] = message
			render()
		},
		setProgress(value) {
			if (destroyed) return
			state.progress = Math.min(Math.max(value, 0), 1)
			if (state.progress === 1) {
				handle.complete()
				return
			}

			render()
		}
	}

	cancel.addEventListener('click', handle.cancel)
	render()

	return handle

	function setPhase(phase: ProgressToastPhase): boolean {
		if (destroyed) return false
		const canTransition = state.phase === PHASES.inProgress
		if (!canTransition) return false

		state.phase = phase
		toast.dataset.phase = phase
		render()
		return true
	}

	function scheduleClose(): void {
		if (destroyed) return
		if (closeTimer !== undefined) return
		closeTimer = window.setTimeout(destroy, closeDelay)
	}

	function destroy(): void {
		if (destroyed) return
		destroyed = true
		if (closeTimer !== undefined) {
			window.clearTimeout(closeTimer)
			closeTimer = undefined
		}
		cancel.removeEventListener('click', handle.cancel)
		void unmount(ring)
		toast.remove()
	}

	function render(): void {
		if (destroyed) return
		setContent(status, resolvedMessages[state.phase])
		setContent(cancel, cancelButton ?? '')
		cancel.hidden = !cancelButton || state.phase !== PHASES.inProgress
		ringHost.hidden = state.phase !== PHASES.inProgress
		ring.setProgress(state.progress)
	}
}

function setContent(element: HTMLElement, value: ProgressToastContent): void {
	element.textContent = ''
	if (value instanceof HTMLElement) {
		element.append(value)
		return
	}

	if (typeof value === 'object') {
		element.textContent = [ value.icon, value.label ].filter(Boolean).join(' ')
		return
	}

	element.textContent = value
}
