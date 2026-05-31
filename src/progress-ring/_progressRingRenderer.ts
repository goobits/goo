import type { GooProgressRingVariant } from './types.ts'

const SPINNER_COLORS = [ '#35ad0e', '#d8ad44', '#d00324', '#dc00b8', '#017efc' ]

/** Visual configuration accepted by the renderer. */
export type ProgressRingRenderConfig = {
	colorStops?: Array<{ color: string; offset: number }>
	fillStyle?: string
	indeterminate?: boolean
	rotationSpeed?: number
	showText?: boolean
	spinnerDuration?: number
	transitionSpeed?: number
	variant?: GooProgressRingVariant
}

/**
 * Framework-agnostic canvas renderer for the Goo progress ring. Lifted verbatim
 * from the former `GooProgressRingElement` so the drawing math is unchanged; the
 * Svelte component and the timer controller drive it imperatively. `host` is the
 * element that carries the CSS size var and ARIA attributes; `canvas` is drawn to.
 */
export class ProgressRingRenderer {
	#host: HTMLElement
	#canvas: HTMLCanvasElement
	#colorStops: Array<{ color: string; offset: number }> = [
		{ offset: 0, color: '#9cdb7d' },
		{ offset: 1, color: '#378cff' }
	]
	#currentProgress = 0
	#fillStyle = ''
	#frameId = 0
	#indeterminate = false
	#lastFrameTime = 0
	#progress = 0
	#rainbowCanvas?: HTMLCanvasElement
	#rainbowCanvasSize = 0
	#rotation = 0
	#rotationSpeed = 72
	#showText = true
	#spinnerColorIndex = 0
	#spinnerDuration = 1000
	#spinnerPreviousStep = 0
	#spinnerStartTime = 0
	#transitionSpeed = 5
	#variant: GooProgressRingVariant = 'basic'
	#value: number | string = 0
	#format = 'PERCENT'

	constructor(host: HTMLElement, canvas: HTMLCanvasElement) {
		this.#host = host
		this.#canvas = canvas
	}

	/** Begin rendering: set baseline ARIA, paint once, and start the animation loop. */
	connect(): void {
		if (!this.#host.hasAttribute('role')) {
			this.#host.setAttribute('role', 'progressbar')
		}

		if (!this.#host.hasAttribute('aria-label') && !this.#host.hasAttribute('aria-labelledby') && !this.#host.hasAttribute('title')) {
			this.#host.setAttribute('aria-label', 'Progress')
		}

		if (!this.#host.hasAttribute('aria-valuemin')) {
			this.#host.setAttribute('aria-valuemin', '0')
		}

		if (!this.#host.hasAttribute('aria-valuemax')) {
			this.#host.setAttribute('aria-valuemax', '100')
		}

		this.#currentProgress = this.#progress
		this.#syncAttributes()
		this.#paint()
		this.#startAnimation()
	}

	/** Stop the animation loop. */
	disconnect(): void {
		this.#stopAnimation()
	}

	/** Canvas used to render the ring. */
	get canvas(): HTMLCanvasElement {
		return this.#canvas
	}

	/** Whether the ring is showing spinner progress instead of a determinate value. */
	get indeterminate(): boolean {
		return this.#indeterminate
	}

	set indeterminate(indeterminate: boolean) {
		this.#indeterminate = indeterminate
		this.#syncAttributes()
		this.#paint()
		this.#startAnimation()
	}

	/** Current normalized progress value. */
	get progress(): number {
		return this.#progress
	}

	/** Show or hide center text. */
	get showText(): boolean {
		return this.#showText
	}

	set showText(showText: boolean) {
		this.#showText = showText
		this.#paint()
	}

	/** Configure visual rendering options for the progress ring. 	 * @param options - options.
	 */
	configure(options: ProgressRingRenderConfig): void {
		this.#colorStops = options.colorStops ?? this.#colorStops
		this.#fillStyle = options.fillStyle ?? this.#fillStyle
		this.#indeterminate = options.indeterminate ?? this.#indeterminate
		this.#rotationSpeed = Number.isFinite(options.rotationSpeed)
			? Math.max(0, options.rotationSpeed as number)
			: this.#rotationSpeed
		this.#showText = options.showText ?? this.#showText
		this.#spinnerDuration = Number.isFinite(options.spinnerDuration)
			? Math.max(1, options.spinnerDuration as number)
			: this.#spinnerDuration
		this.#transitionSpeed = options.transitionSpeed ?? this.#transitionSpeed
		this.#variant = options.variant ?? this.#variant
		this.#host.dataset.variant = this.#variant
		this.#syncAttributes()
		this.#paint()
		this.#startAnimation()
	}

	/** Update the ring progress and optional display labels. 	 * @param progress - progress.
	 * @param display - display.
	 */
	setProgress(progress: number, display?: { format?: string; value?: number | string }): void {
		this.#progress = clampProgress(progress)
		this.#value = display?.value ?? Math.ceil(this.#progress * 100)
		this.#format = display?.format ?? 'PERCENT'
		const degrees = this.#progress * 360
		this.#host.style.setProperty('--goo-progress-ring-progress', `${ degrees }deg`)
		this.#syncAttributes()
		this.#paint()
		this.#startAnimation()
	}

	#startAnimation(): void {
		if (!this.#indeterminate && this.#variant !== 'rainbow') {
			this.#stopAnimation()
			return
		}

		if (this.#frameId || !this.#host.isConnected) {
			return
		}

		const frame = (time: number) => {
			this.#frameId = window.requestAnimationFrame(frame)
			this.#paint(time)
		}
		this.#frameId = window.requestAnimationFrame(frame)
	}

	#stopAnimation(): void {
		window.cancelAnimationFrame(this.#frameId)
		this.#frameId = 0
		this.#lastFrameTime = 0
	}

	#paint(time = 0): void {
		const ctx = getCanvasContext(this.#canvas)
		if (!ctx) {
			return
		}

		const styles = window.getComputedStyle(this.#host)
		const size = parseCssSize(styles.getPropertyValue('--goo-progress-ring-size'), this.#host.clientWidth || 120)
		const dpr = window.devicePixelRatio || 1
		const pixelSize = Math.max(1, Math.round(size * dpr))

		if (this.#canvas.width !== pixelSize || this.#canvas.height !== pixelSize) {
			this.#canvas.width = pixelSize
			this.#canvas.height = pixelSize
			this.#canvas.style.width = `${ size }px`
			this.#canvas.style.height = `${ size }px`
		}

		if (this.#indeterminate) {
			this.#paintSpinner(ctx, pixelSize, time || performance.now())
			return
		}

		const delta = this.#lastFrameTime && time
			? (time - this.#lastFrameTime) / 1000
			: 0
		this.#lastFrameTime = time || this.#lastFrameTime

		if (this.#variant === 'rainbow') {
			const distance = this.#progress - this.#currentProgress
			const step = Math.min(1, this.#transitionSpeed * (delta || 1 / 60))
			this.#currentProgress += distance * step
			if (Math.abs(this.#progress - this.#currentProgress) < 0.001) {
				this.#currentProgress = this.#progress
			}
			this.#rotation = (this.#rotation + this.#rotationSpeed * (delta || 1 / 60)) % 360
		} else {
			this.#currentProgress = this.#progress
		}

		const outerRadius = pixelSize / 2
		const innerRadius = this.#variant === 'rainbow'
			? outerRadius * (this.#showText ? 0.6 : 0.3)
			: outerRadius * 0.61
		let startAngle = -Math.PI * 2
		const endAngle = this.#currentProgress * Math.PI * 2

		ctx.clearRect(0, 0, pixelSize, pixelSize)
		ctx.save()

		ctx.beginPath()
		ctx.arc(outerRadius, outerRadius, outerRadius, startAngle, endAngle, false)
		ctx.arc(outerRadius, outerRadius, innerRadius, endAngle, startAngle, true)
		ctx.fillStyle = this.#fillColor()
		ctx.globalAlpha = this.#variant === 'rainbow' ? 0.15 : 0.25
		ctx.fill()

		if (this.#currentProgress > 0) {
			startAngle += Math.PI * 2
			ctx.beginPath()
			ctx.arc(outerRadius, outerRadius, outerRadius, startAngle, endAngle, false)
			ctx.arc(outerRadius, outerRadius, innerRadius, endAngle, startAngle, true)
			ctx.globalAlpha = 1
			ctx.fillStyle = this.#fillColor()
			ctx.fill()

			if (this.#variant === 'rainbow') {
				ctx.translate(outerRadius, outerRadius)
				ctx.rotate(this.#rotation * Math.PI / 180)
				ctx.translate(-outerRadius, -outerRadius)
				ctx.globalCompositeOperation = 'source-atop'
				ctx.drawImage(this.#getRainbowCanvas(pixelSize), 0, 0)
			}
		}

		ctx.restore()

		if (this.#showText) {
			this.#paintText(ctx, styles.color, pixelSize, dpr)
		}
	}

	#paintSpinner(ctx: CanvasRenderingContext2D, pixelSize: number, time: number): void {
		if (!this.#spinnerStartTime) {
			this.#spinnerStartTime = time
		}

		const duration = this.#spinnerDuration
		const tailDuration = duration * 2.5
		const tick = time - this.#spinnerStartTime
		const acceleration = easeInOutQuad((tick + tailDuration / 2) % tailDuration, 0, duration, tailDuration)
		const head = easeLinear((tick + acceleration) % duration, 0, 360, duration)
		const tail = 20 + Math.abs(easeLinear((tick + tailDuration / 2) % tailDuration, -300, 600, tailDuration))
		const currentStep = tick % duration
		if (currentStep < this.#spinnerPreviousStep) {
			this.#spinnerColorIndex = (this.#spinnerColorIndex + 1) % SPINNER_COLORS.length
		}
		this.#spinnerPreviousStep = currentStep

		const center = pixelSize / 2
		const lineWidth = center * 0.25
		const radius = 3 * lineWidth
		const startAngle = ((Math.trunc(head - tail) % 360) * Math.PI) / 180
		const endAngle = ((Math.trunc(head) % 360) * Math.PI) / 180

		ctx.clearRect(0, 0, pixelSize, pixelSize)
		ctx.beginPath()
		ctx.arc(center, center, radius, startAngle, endAngle, false)
		ctx.strokeStyle = this.#spinnerColor(currentStep, duration)
		ctx.lineCap = 'round'
		ctx.lineWidth = lineWidth
		ctx.stroke()
	}

	#fillColor(): string {
		if (this.#variant === 'rainbow') {
			return this.#fillStyle || 'white'
		}

		if (this.#fillStyle) {
			return this.#fillStyle
		}

		const progress = this.#currentProgress
		const stops = [ ...this.#colorStops ].sort((a, b) => a.offset - b.offset)
		const nextIndex = stops.findIndex(stop => progress <= stop.offset)
		if (nextIndex <= 0) {
			return stops[0]?.color ?? '#378cff'
		}

		const previous = stops[nextIndex - 1]
		const next = stops[nextIndex]
		const range = next.offset - previous.offset || 1
		return mixColor(previous.color, next.color, (progress - previous.offset) / range)
	}

	#getRainbowCanvas(size: number): HTMLCanvasElement {
		if (this.#rainbowCanvas && this.#rainbowCanvasSize === size) {
			return this.#rainbowCanvas
		}

		const canvas = document.createElement('canvas')
		const ctx = getCanvasContext(canvas)
		canvas.width = size
		canvas.height = size
		this.#rainbowCanvas = canvas
		this.#rainbowCanvasSize = size
		if (!ctx) {
			return canvas
		}

		ctx.translate(size / 2, size / 2)
		ctx.rotate(Math.PI)
		ctx.lineWidth = 5
		ctx.lineCap = 'round'

		for (let i = 0; i <= 360; i++) {
			ctx.save()
			ctx.rotate(i * Math.PI / 180)
			ctx.translate(-ctx.lineWidth / 2, ctx.lineWidth / 2)
			ctx.beginPath()
			ctx.moveTo(0, 0)
			ctx.lineTo(0, size)
			ctx.closePath()
			ctx.strokeStyle = `hsl(${ i }, 100%, 50%)`
			ctx.stroke()
			ctx.restore()
		}

		return canvas
	}

	#paintText(ctx: CanvasRenderingContext2D, color: string, pixelSize: number, dpr: number): void {
		const ratio = pixelSize / 300
		const fontFamily = '"Trebuchet MS", Arial, Helvetica, sans-serif'
		const value = this.#variant === 'rainbow'
			? Math.floor(this.#currentProgress * 100)
			: this.#value
		ctx.fillStyle = color || '#fff'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'

		if (pixelSize / dpr < 84) {
			ctx.font = `bold ${ ratio * 55 }px ${ fontFamily }`
			ctx.fillText(String(value), pixelSize / 2, pixelSize / 2 - ratio * 30)
			return
		}

		ctx.font = `bold ${ ratio * 26 }px ${ fontFamily }`
		ctx.fillText(this.#format, pixelSize / 2, pixelSize / 2 + ratio * 14)

		ctx.font = `bold ${ ratio * 46 }px ${ fontFamily }`
		ctx.fillText(String(value), pixelSize / 2, pixelSize / 2 - ratio * 44)
	}

	#spinnerColor(currentStep: number, duration: number): string {
		const start = parseHexColor(SPINNER_COLORS[this.#spinnerColorIndex])
		const end = parseHexColor(SPINNER_COLORS[(this.#spinnerColorIndex + 1) % SPINNER_COLORS.length])
		if (!start || !end) {
			return SPINNER_COLORS[this.#spinnerColorIndex]
		}

		const r = clampChannel(easeLinear(currentStep, start.r, end.r - start.r, duration), start.r, end.r)
		const g = clampChannel(easeLinear(currentStep, start.g, end.g - start.g, duration), start.g, end.g)
		const b = clampChannel(easeLinear(currentStep, start.b, end.b - start.b, duration), start.b, end.b)
		return `rgb(${ Math.trunc(r) }, ${ Math.trunc(g) }, ${ Math.trunc(b) })`
	}

	#syncAttributes(): void {
		this.#host.dataset.indeterminate = String(this.#indeterminate)
		this.#host.setAttribute('aria-busy', String(this.#indeterminate))
		if (this.#indeterminate) {
			this.#host.removeAttribute('aria-valuenow')
			this.#host.removeAttribute('aria-valuetext')
			return
		}

		const percent = Math.round(this.#progress * 100)
		this.#host.setAttribute('aria-valuenow', `${ percent }`)
		this.#host.setAttribute('aria-valuetext', `${ percent }%`)
	}
}

/** Clamp a value into the normalized 0..1 progress range.  * @param progress - progress.
 */
export function clampProgress(progress: number): number {
	return Math.min(1, Math.max(0, progress))
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
	try {
		return canvas.getContext('2d')
	} catch {
		return null
	}
}

function parseCssSize(value: string, fallback: number): number {
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) && parsed > 0
		? parsed
		: fallback
}

function clampChannel(value: number, from: number, to: number): number {
	return Math.max(Math.min(from, to), Math.min(Math.max(from, to), value))
}

function easeInOutQuad(time: number, start: number, change: number, duration: number): number {
	let progress = time / (duration / 2)
	if (progress < 1) {
		return change / 2 * progress * progress + start
	}

	progress -= 1
	return -change / 2 * (progress * (progress - 2) - 1) + start
}

function easeLinear(time: number, start: number, change: number, duration: number): number {
	return change * time / duration + start
}

function mixColor(from: string, to: string, amount: number): string {
	const start = parseHexColor(from)
	const end = parseHexColor(to)
	if (!start || !end) {
		return to
	}

	const ratio = clampProgress(amount)
	const r = Math.round(start.r + (end.r - start.r) * ratio)
	const g = Math.round(start.g + (end.g - start.g) * ratio)
	const b = Math.round(start.b + (end.b - start.b) * ratio)
	return `rgb(${ r }, ${ g }, ${ b })`
}

function parseHexColor(color: string): { b: number; g: number; r: number } | null {
	const normalized = color.trim().replace('#', '')
	if (!/^[\da-f]{6}$/i.test(normalized)) {
		return null
	}

	return {
		r: Number.parseInt(normalized.slice(0, 2), 16),
		g: Number.parseInt(normalized.slice(2, 4), 16),
		b: Number.parseInt(normalized.slice(4, 6), 16)
	}
}
