/**
 * Cloudflare Turnstile explicit-rendering script loader.
 *
 * The promise and Trusted Types policy live on `window` so separately bundled
 * Goo consumers still share one script and one policy.
 *
 * Internal helper — not exported from the package.
 */

import type { GooTurnstileSize, GooTurnstileTheme } from './types.ts'

export type GooTurnstileRenderOptions = {
	sitekey: string
	action?: string
	cData?: string
	theme: GooTurnstileTheme
	size: GooTurnstileSize
	callback?: (token: string) => void
	'error-callback'?: (code: string) => boolean
	'expired-callback'?: () => void
}

export type GooTurnstileApi = {
	render: (container: HTMLElement, options: GooTurnstileRenderOptions) => string
	remove?: (widgetId: string) => void
	reset?: (widgetId: string) => void
}

type GooTrustedTypesPolicy = {
	createScriptURL: (input: string) => string
}

type GooTurnstileWindow = Window &
	typeof globalThis & {
		turnstile?: GooTurnstileApi
		__gooTurnstileLoader?: Promise<GooTurnstileApi>
		__gooTurnstileTrustedTypesPolicy?: GooTrustedTypesPolicy
		trustedTypes?: {
			createPolicy: (
				name: string,
				rules: { createScriptURL: (input: string) => string }
			) => GooTrustedTypesPolicy
			getPolicy?: (name: string) => GooTrustedTypesPolicy | undefined
		}
	}

const TURNSTILE_SCRIPT_SRC =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TURNSTILE_SCRIPT_ID = 'goo-turnstile-script'
const TURNSTILE_TRUSTED_TYPES_POLICY = 'goo-turnstile'

function getTurnstileWindow(): GooTurnstileWindow {
	return window as GooTurnstileWindow
}

function getTurnstileScriptUrl(turnstileWindow: GooTurnstileWindow): string {
	if (!turnstileWindow.trustedTypes) return TURNSTILE_SCRIPT_SRC

	const existing =
		turnstileWindow.__gooTurnstileTrustedTypesPolicy ??
		turnstileWindow.trustedTypes.getPolicy?.(TURNSTILE_TRUSTED_TYPES_POLICY)
	if (existing) {
		turnstileWindow.__gooTurnstileTrustedTypesPolicy = existing
		return existing.createScriptURL(TURNSTILE_SCRIPT_SRC)
	}

	const policy = turnstileWindow.trustedTypes.createPolicy(TURNSTILE_TRUSTED_TYPES_POLICY, {
		createScriptURL: input => {
			if (input !== TURNSTILE_SCRIPT_SRC) {
				throw new TypeError('untrusted-turnstile-script-url')
			}
			return input
		}
	})
	turnstileWindow.__gooTurnstileTrustedTypesPolicy = policy
	return policy.createScriptURL(TURNSTILE_SCRIPT_SRC)
}

function findTurnstileScript(): HTMLScriptElement | null {
	return (
		document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
	) ?? document.querySelector<HTMLScriptElement>(`script[src="${ TURNSTILE_SCRIPT_SRC }"]`)
}

/**
 * Load the Turnstile explicit-rendering API once.
 *
 * A failed load clears its shared promise and removes Goo's failed script so a
 * later mount can retry.
 */
export function ensureTurnstileScript(): Promise<GooTurnstileApi> {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return Promise.reject(new Error('turnstile-document-unavailable'))
	}

	const turnstileWindow = getTurnstileWindow()
	if (turnstileWindow.turnstile) {
		return Promise.resolve(turnstileWindow.turnstile)
	}
	if (turnstileWindow.__gooTurnstileLoader) {
		return turnstileWindow.__gooTurnstileLoader
	}

	const loader = new Promise<GooTurnstileApi>((resolve, reject) => {
		const existing = findTurnstileScript()
		const script = existing ?? document.createElement('script')

		const detach = () => {
			script.removeEventListener('load', handleLoad)
			script.removeEventListener('error', handleError)
		}
		const fail = (error: Error) => {
			detach()
			if (script.id === TURNSTILE_SCRIPT_ID) script.remove()
			reject(error)
		}
		const handleLoad = () => {
			detach()
			if (turnstileWindow.turnstile) {
				resolve(turnstileWindow.turnstile)
				return
			}
			fail(new Error('turnstile-api-unavailable'))
		}
		const handleError = () => {
			fail(new Error('turnstile-script-failed'))
		}

		script.addEventListener('load', handleLoad, { once: true })
		script.addEventListener('error', handleError, { once: true })

		if (existing) return

		script.id = TURNSTILE_SCRIPT_ID
		script.src = getTurnstileScriptUrl(turnstileWindow)
		script.async = true
		script.defer = true
		document.head.appendChild(script)
	})

	turnstileWindow.__gooTurnstileLoader = loader
	void loader.catch(() => {
		if (turnstileWindow.__gooTurnstileLoader === loader) {
			delete turnstileWindow.__gooTurnstileLoader
		}
	})
	return loader
}

/** Reset browser-global loader state between tests. */
export function _resetTurnstileLoaderForTests(): void {
	if (typeof window === 'undefined') return
	const turnstileWindow = getTurnstileWindow()
	delete turnstileWindow.__gooTurnstileLoader
	delete turnstileWindow.__gooTurnstileTrustedTypesPolicy
}
