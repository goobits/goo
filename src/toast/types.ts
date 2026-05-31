/** Visual variant for a toast. */
export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

/** Position on screen where the GooToaster mounts its queue. */
export type ToastPosition =
	| 'top-left'
	| 'top-center'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-center'
	| 'bottom-right'

/** Action button rendered inside the toast (e.g. Undo / Retry). */
export type ToastAction = {

	/** Visible label. */
	label: string

	/** Callback fired when the action is activated. */
	onClick: () => void
}

/** Options accepted by `toast.success` / `toast.error` / `toast.warning` / `toast.info`. */
export type ToastOptions = {

	/** Visual variant. */
	variant?: ToastVariant

	/** Auto-dismiss duration in ms; 0 disables auto-dismiss (sticky). */
	duration?: number

	/** Whether the user can dismiss the toast via the ✕ button. */
	dismissible?: boolean

	/** Optional action button. */
	action?: ToastAction

	/** Custom icon override; otherwise the variant default is used. */
	icon?: string

	/** Optional supplementary message rendered under the title. */
	message?: string

	/** Stable id used for dedup; re-issuing refreshes the existing toast in place. */
	id?: string
}

/** Internal toast record stored in the queue. */
export type Toast = {
	id: string
	variant: ToastVariant
	title: string
	message?: string
	duration: number
	dismissible: boolean
	action?: ToastAction
	icon: string
	createdAt: number
}

/** Props accepted by the `GooToast` component. */
export type GooToastProps = {

	/** Toast record to render. */
	toast: Toast

	/** Callback invoked when the toast wants to be removed from the queue. */
	ondismiss: (id: string) => void

	/** Extra class names applied to the wrapper. */
	class?: string
}

/** Props accepted by the `GooToaster` component. */
export type GooToasterProps = {

	/** Where on the screen to mount the queue. Defaults to 'top-right'. */
	position?: ToastPosition

	/** Maximum simultaneous toasts. Older ones are evicted when the queue is full. Defaults to 5. */
	max?: number

	/** Extra class names applied to the container. */
	class?: string
}

/** Imperative toast service interface (exported as `toast`). */
export type ToastService = {

	/** Show an info toast. */
	info: (title: string, options?: ToastOptions) => string

	/** Show a success toast. */
	success: (title: string, options?: ToastOptions) => string

	/** Show a warning toast. */
	warning: (title: string, options?: ToastOptions) => string

	/** Show an error toast (sticky by default — pass `duration` to override). */
	error: (title: string, options?: ToastOptions) => string

	/** Show a toast with explicit options. */
	show: (title: string, options?: ToastOptions) => string

	/** Update an existing toast title/options by id. */
	update: (id: string, title: string, options?: ToastOptions) => void

	/** Dismiss a toast by id. */
	dismiss: (id: string) => void

	/** Dismiss every toast in the queue. */
	clear: () => void
}
