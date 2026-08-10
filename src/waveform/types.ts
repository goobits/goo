import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** One measured amplitude/color bar rendered by `GooWaveform`. */
export type GooWaveformBar = {
	amplitude: number
	color?: string | null
}

/** Density and height presets for the shared waveform surface. */
export type GooWaveformVariant = 'detail' | 'compact' | 'mini'

/** Props accepted by the Svelte waveform component. */
export type GooWaveformProps = GooForwardedAttributes & {
	/** Measured presentation bars. Empty input renders an unavailable rail. */
	bars?: readonly GooWaveformBar[]

	/** Extra class names. */
	class?: string

	/** Optional fallback color for measured bars without a stored color. */
	color?: string

	/** Accessible name when the waveform is not decorative. */
	label?: string

	/** Normalized playback progress. Omit to show every bar at equal emphasis. */
	progress?: number | null

	/** Visual size preset. */
	variant?: GooWaveformVariant
}
