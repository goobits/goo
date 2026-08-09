export const DEFAULT_PROGRESS_STATUS_DWELL_MS = 500

type ProgressStatusDwellOptions = {
	initialText: string
	minimumDurationMs?: number
	onTextChange: (text: string) => void
}

export type ProgressStatusDwell = {
	destroy(): void
	update(text: string, immediate?: boolean): void
}

export function createProgressStatusDwell({
	initialText,
	minimumDurationMs = DEFAULT_PROGRESS_STATUS_DWELL_MS,
	onTextChange
}: ProgressStatusDwellOptions): ProgressStatusDwell {
	const duration = Number.isFinite(minimumDurationMs)
		? Math.max(0, minimumDurationMs)
		: DEFAULT_PROGRESS_STATUS_DWELL_MS
	let currentText = initialText
	let currentSince = Date.now()
	let pendingText: string | undefined
	let timer: ReturnType<typeof setTimeout> | undefined
	let destroyed = false

	return {
		destroy() {
			if (destroyed) return
			destroyed = true
			clearTimer()
			pendingText = undefined
		},
		update(text, immediate = false) {
			if (destroyed) return
			if (immediate) {
				clearTimer()
				pendingText = undefined
				if (text !== currentText) {
					currentText = text
					currentSince = Date.now()
					onTextChange(text)
				}
				return
			}

			if (text === currentText) {
				pendingText = undefined
				clearTimer()
				return
			}

			pendingText = text
			advance()
		}
	}

	function advance(): void {
		clearTimer()
		if (destroyed) return

		const remaining = duration - (Date.now() - currentSince)
		if (remaining > 0) {
			timer = setTimeout(advance, remaining)
			return
		}

		if (destroyed || pendingText === undefined) return

		currentText = pendingText
		pendingText = undefined
		currentSince = Date.now()
		onTextChange(currentText)
	}

	function clearTimer(): void {
		if (timer === undefined) return
		clearTimeout(timer)
		timer = undefined
	}
}
