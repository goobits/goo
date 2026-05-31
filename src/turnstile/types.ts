/** Visual theme passed through to the Cloudflare Turnstile widget. */
export type GooTurnstileTheme = 'auto' | 'light' | 'dark'

/** Widget render size passed through to the Cloudflare Turnstile widget. */
export type GooTurnstileSize = 'normal' | 'compact' | 'flexible'

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

	/** Accessible name for the verification widget group. Defaults to 'Security verification'. */
	label?: string

	/** Extra class names applied to the wrapper element. */
	class?: string

	/** Inline style applied to the wrapper element. */
	style?: string
}
