/**
 * @fileoverview Locale and internationalization utilities for goo components.
 * Provides a simple adapter interface that consumers wire to their i18n system.
 * @module goobits/i18n
 */

/** Locale Config request or option shape for runtime integration. */
export interface LocaleConfig {

	/** Right-to-left text direction */
	rtl?: boolean

	/** Current locale string (e.g., 'en-US') */
	locale?: string

	/** Translation function - receives key and optional args, returns translated string */
	translate?: (key: string, ...args: unknown[]) => string
}

type Listener = () => void

// Default identity translator - returns key unchanged
const identity = (key: string) => key

// Private state
let config: Required<LocaleConfig> = {
	rtl: false,
	locale: 'en-US',
	translate: identity
}

const listeners = new Set<Listener>()

/**
	 * Configure locale settings for goo components.
	 * Can be called multiple times to update settings.
	 *
	 * @example
	 * // Basic setup
	 * setLocale({ rtl: true, locale: 'ar-SA' })
	 *
	 * @example
	 * // With translation function
	 * setLocale({
	 *   rtl: document.dir === 'rtl',
	 *   locale: navigator.language,
	 *   translate: (key) => myI18nLibrary.t(key)
	 * })
	 * @param options - options.
	 */
export function setLocale(options: LocaleConfig): void {
	const prevRtl = config.rtl
	const prevLocale = config.locale

	config = {
		rtl: options.rtl ?? config.rtl,
		locale: options.locale ?? config.locale,
		translate: options.translate ?? config.translate
	}

	// Notify listeners if rtl or locale changed
	if (prevRtl !== config.rtl || prevLocale !== config.locale) {
		for (const listener of listeners) {
			listener()
		}
	}
}

/**
 * Check if RTL (right-to-left) mode is active.
 * @returns True if current locale is RTL
 */
export function isRTL(): boolean {
	return config.rtl
}

/**
 * Get the current locale string.
 * @returns Current locale (e.g., 'en-US', 'ar-SA')
 */
export function getLocale(): string {
	return config.locale
}

/**
 * Translate a key using the configured translation function.
 * Returns the key unchanged if no translator is configured.
 *
 * @param key - Translation key to look up
 * @param args - Optional arguments for interpolation
 * @returns Translated string
 *
 * @example
 * translate('hello') // 'Hello'
 * translate('greeting', 'World') // 'Hello, World!'
 */
export function translate(key: string, ...args: unknown[]): string {
	return config.translate(key, ...args)
}

/**
 * Subscribe to locale changes.
 * Callback is invoked when rtl or locale values change via setLocale().
 *
 * @param callback - Function to call when locale changes
 * @returns Unsubscribe function
 *
 * @example
 * const unsubscribe = onLocaleChange(() => {
 *   console.log('Locale changed to:', getLocale())
 * })
 * // Later: unsubscribe()
 */
export function onLocaleChange(callback: Listener): () => void {
	listeners.add(callback)
	return () => {
		listeners.delete(callback)
	}
}
