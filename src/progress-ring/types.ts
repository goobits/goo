import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Visual progress ring variant. */
export type GooProgressRingVariant = 'basic' | 'rainbow'

/** Progress ring timer mode. */
export type GooProgressRingTimerType = 'progress' | 'time'

/** Progress ring weighted-step configuration. */
export type GooProgressRingSteps = number | number[]

/** Declarative props accepted by the Svelte progress ring component. */
export type GooProgressRingProps = GooForwardedAttributes & {
	/** Normalized progress from 0 to 1. */
	progress?: number

	/** Ring diameter in CSS pixels. */
	size?: number

	/** Ring stroke thickness in CSS pixels. */
	thickness?: number

	/** Ring color. The default uses Goo's progress gradient. */
	color?: string

	/** Whether to paint the percentage in the center. */
	showText?: boolean

	/** Accessible name for the progress bar. */
	label?: string

	/** Whether to render an indeterminate spinner. */
	indeterminate?: boolean

	/** Visual ring variant. */
	variant?: GooProgressRingVariant

	/** Extra class names. */
	class?: string
}

/** Imperative handle exposed internally by a mounted `GooProgressRing` component. */
export type GooProgressRingComponentHandle = {
	configure(options: {
		colorStops?: Array<{ color: string; offset: number }>
		fillStyle?: string
		indeterminate?: boolean
		rotationSpeed?: number
		showText?: boolean
		spinnerDuration?: number
		thickness?: number
		transitionSpeed?: number
		variant?: GooProgressRingVariant
	}): void
	setProgress(progress: number, display?: { format?: string; value?: number | string }): void
	setIndeterminate(value: boolean): void
	getCanvas(): HTMLCanvasElement | undefined
}

/** Progress ring timer options. */
export type GooProgressRingTimerOptions = {
	colorStops?: Array<{ color: string; offset: number }>
	fillStyle?: string
	format?: string
	indeterminate?: boolean
	parentNode?: Element | string | null
	progress?: number
	range?: [number, number]
	rotationSpeed?: number
	showBackdrop?: boolean
	showText?: boolean
	size?: number
	spinnerDuration?: number
	steps?: GooProgressRingSteps
	transitionSpeed?: number
	type?: GooProgressRingTimerType
	useAutoHide?: boolean
	variant?: GooProgressRingVariant
}

/** Runtime controller returned by `createGooProgressRingTimer`. */
export type GooProgressRingTimer = {
	advance(): void
	destroy(duration?: number): void
	readonly duration: number
	readonly element: HTMLElement
	hide(options?: { immediate?: boolean }): void
	indeterminate: boolean
	progress: number
	setProgress(progress: number): void
	show(view?: 'cover'): void
	readonly stepIndex: number
	steps: GooProgressRingSteps | null
	readonly totalProgress: number
	visible: boolean
}
