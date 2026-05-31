/**
 * Cloudflare Turnstile script loader.
 *
 * Ensures the Turnstile script is added to the document exactly once even
 * if multiple `GooTurnstileField` instances render concurrently.
 *
 * Internal helper — not exported from the package.
 */

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
const TURNSTILE_SCRIPT_ID = 'goo-turnstile-script'

let loaderPromise: Promise<void> | null = null

/**
 * Ensure the Turnstile script tag is present in the document.
 * @returns Promise that resolves once the script has loaded (or immediately if already present).
 */
export function ensureTurnstileScript(): Promise<void> {
	if (typeof document === 'undefined') {
		return Promise.resolve()
	}

	if (loaderPromise) {
		return loaderPromise
	}

	const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
	if (existing) {
		loaderPromise = Promise.resolve()
		return loaderPromise
	}

	loaderPromise = new Promise<void>((resolve, reject) => {
		const script = document.createElement('script')
		script.id = TURNSTILE_SCRIPT_ID
		script.src = TURNSTILE_SCRIPT_SRC
		script.async = true
		script.defer = true
		script.onload = () => resolve()
		script.onerror = () => {
			loaderPromise = null
			reject(new Error('Failed to load Cloudflare Turnstile script'))
		}
		document.head.appendChild(script)
	})

	return loaderPromise
}

/** Test-only: reset the loader state (used by unit tests). */
export function _resetTurnstileLoaderForTests(): void {
	loaderPromise = null
}
