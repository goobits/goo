import type { Snippet } from 'svelte'

/** Optional fallback snippet rendered when an error is captured. */
export type GooErrorBoundaryFallback = Snippet<[error: Error, reset: () => void]>

/** Props accepted by the Svelte `GooErrorBoundary` component. */
export type GooErrorBoundaryProps = {

	/** Content rendered when no error has been captured. */
	children: Snippet

	/** Optional fallback snippet rendered with the captured error + reset callback. */
	fallback?: GooErrorBoundaryFallback

	/** Optional hook fired every time an error is captured (use to forward to a logger). */
	onError?: (error: Error) => void

	/** Extra class names applied to the boundary wrapper. */
	class?: string

	/** Inline style applied to the boundary wrapper. */
	style?: string
}
