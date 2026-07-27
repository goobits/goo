/** Visual theme passed through to the Cloudflare Turnstile widget. */
export type GooTurnstileTheme = 'auto' | 'light' | 'dark'

/** Widget render size passed through to the Cloudflare Turnstile widget. */
export type GooTurnstileSize = 'normal' | 'compact' | 'flexible'

/** Failure reported while loading, rendering, or running a Turnstile widget. */
export type GooTurnstileError =
	| {
		source: 'script' | 'render'
		error: Error
	}
	| {
		source: 'widget'
		code: string
	}

/** Props accepted by the Svelte `GooTurnstileField` component. */
export type GooTurnstileFieldProps = {

	/** Cloudflare Turnstile site key (public). Component renders nothing when empty. */
	siteKey?: string

	/** Optional action identifier passed to Turnstile (data-action). */
	action?: string

	/** Optional custom data passed to Turnstile (data-cdata). */
	cData?: string

	/** Visual theme. */
	theme?: GooTurnstileTheme

	/** Render size. */
	size?: GooTurnstileSize

	/**
	 * Reset the rendered widget whenever this value changes after its initial
	 * value is observed.
	 */
	resetSignal?: unknown

	/** Called after the widget has been rendered and can accept resets. */
	onReady?: () => void

	/** Called when Turnstile issues a fresh response token. */
	onToken?: (token: string) => void

	/** Called when a response token expires. */
	onExpired?: () => void

	/** Called when script loading, widget rendering, or the widget itself fails. */
	onError?: (error: GooTurnstileError) => void

	/** Accessible name for the verification widget group. Defaults to 'Security verification'. */
	label?: string

	/** Extra class names applied to the wrapper element. */
	class?: string

	/** Inline style applied to the wrapper element. */
	style?: string
}
