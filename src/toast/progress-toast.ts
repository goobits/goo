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

/** Imperative progress toast element. */
export type GooProgressToastElement = HTMLElement & {
	cancel(): void
	complete(): void
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
}: GooProgressToastOptions = {}): GooProgressToastElement {
	const resolvedMessages: ProgressToastMessages = {
		canceled: messages.canceled ?? 'Operation canceled.',
		completed: messages.completed ?? 'Operation completed.',
		error: messages.error ?? 'Operation failed.',
		inProgress: messages.inProgress ?? 'Operation in progress.'
	}
	const state: { phase: ProgressToastPhase; progress: number } = { phase: PHASES.inProgress, progress: 0 }
	const toast = document.createElement('div') as unknown as GooProgressToastElement
	const status = document.createElement('p')
	const ringHost = document.createElement('div')
	const cancel = document.createElement('button')
	const ring = mount(GooProgressRing, { target: ringHost }) as { setProgress(value: number): void }

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

	toast.cancel = () => {
		if (setPhase(PHASES.canceled)) {
			toast.dispatchEvent(new CustomEvent('cancel'))
			scheduleClose()
		}
	}
	toast.complete = () => {
		if (setPhase(PHASES.completed)) {
			toast.dispatchEvent(new CustomEvent('complete'))
			scheduleClose()
		}
	}
	toast.error = () => {
		if (setPhase(PHASES.error)) {
			toast.dispatchEvent(new CustomEvent('error'))
			scheduleClose()
		}
	}
	toast.setMessage = message => {
		resolvedMessages[state.phase] = message
		render()
	}
	toast.setProgress = value => {
		state.progress = Math.min(Math.max(value, 0), 1)
		if (state.progress === 1) {
			toast.complete()
			return
		}

		render()
	}

	cancel.addEventListener('click', toast.cancel)
	render()

	return toast

	function setPhase(phase: ProgressToastPhase): boolean {
		const canTransition = state.phase === PHASES.inProgress
		if (!canTransition) return false

		state.phase = phase
		toast.dataset.phase = phase
		render()
		return true
	}

	function scheduleClose(): void {
		window.setTimeout(() => {
			unmount(ring)
			toast.remove()
		}, closeDelay)
	}

	function render(): void {
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
