import type { Toast, ToastOptions, ToastService, ToastVariant } from './types.ts'

const DEFAULT_ICONS: Record<ToastVariant, string> = {
	info: 'ℹ',
	success: '✓',
	warning: '⚠',
	error: '✕'
}

function generateId(): string {
	return `toast-${ Date.now() }-${ Math.random().toString(36).slice(2, 11) }`
}

/**
 * Reactive toast store. Backed by Svelte 5 runes — its `toasts` field is a
 * `$state` array, so consumers (notably `GooToaster`) re-render automatically
 * when toasts are added or removed.
 */
class ToastStore {
	#toasts = $state<Toast[]>([])

	get toasts(): Toast[] {
		return this.#toasts
	}

	add(title: string, options: ToastOptions = {}): string {
		const variant = options.variant ?? 'info'
		const id = options.id ?? generateId()
		const duration = options.duration ?? (variant === 'error' ? 0 : 5000)

		const record: Toast = {
			id,
			variant,
			title,
			message: options.message,
			duration,
			dismissible: options.dismissible ?? true,
			action: options.action,
			icon: options.icon ?? DEFAULT_ICONS[variant],
			createdAt: Date.now()
		}

		const existingIndex = this.#toasts.findIndex(t => t.id === id)
		if (existingIndex >= 0) {
			this.#toasts[existingIndex] = record
		} else {
			this.#toasts.push(record)
		}

		return id
	}

	remove(id: string): void {
		const index = this.#toasts.findIndex(t => t.id === id)
		if (index >= 0) {
			this.#toasts.splice(index, 1)
		}
	}

	update(id: string, title: string, options: ToastOptions = {}): void {
		const existing = this.#toasts.find(t => t.id === id)
		if (!existing) return

		this.add(title, { ...options, id, variant: options.variant ?? existing.variant })
	}

	clear(): void {
		this.#toasts.length = 0
	}

	/** Evict the oldest toast (used by GooToaster when `max` is exceeded). */
	evictOldest(): void {
		if (this.#toasts.length > 0) {
			this.#toasts.shift()
		}
	}
}

/** Singleton store instance shared across the app. */
export const toastStore = new ToastStore()

/**
	 * Imperative toast API.
	 *
	 * @example
	 *   toast.success('Saved')
	 *   toast.error('Failed', { duration: 0, action: { label: 'Retry', onClick: retry } })
	 */
export const toast: ToastService = {
	info: (title, options) => toastStore.add(title, { ...options, variant: 'info' }),
	success: (title, options) => toastStore.add(title, { ...options, variant: 'success' }),
	warning: (title, options) => toastStore.add(title, { ...options, variant: 'warning' }),
	error: (title, options) => toastStore.add(title, { ...options, variant: 'error' }),
	show: (title, options) => toastStore.add(title, options),
	update: (id, title, options) => toastStore.update(id, title, options),
	dismiss: id => toastStore.remove(id),
	clear: () => toastStore.clear()
}

/** Test-only: reset the singleton store. Not part of the public API. */
export function _resetToastStoreForTests(): void {
	toastStore.clear()
}
