<script lang="ts">
import './GooErrorBoundary.css'
import type { GooErrorBoundaryProps } from './types.js'

let {
	children,
	fallback,
	onError,
	class: className = '',
	style
}: GooErrorBoundaryProps = $props()

let capturedError: Error | null = $state(null)

function handleError(event: ErrorEvent | PromiseRejectionEvent): void {
	const error =
		event instanceof ErrorEvent
			? event.error ?? new Error(event.message || 'Unknown error')
			: (event.reason instanceof Error
				? event.reason
				: new Error(String(event.reason ?? 'Unknown rejection')))

	capturedError = error
	onError?.(error)

	if (event instanceof ErrorEvent) {
		event.preventDefault()
	}
}

function reset(): void {
	capturedError = null
}

$effect(() => {
	if (typeof window === 'undefined') return

	const onWindowError = (event: ErrorEvent) => handleError(event)
	const onWindowRejection = (event: PromiseRejectionEvent) => handleError(event)

	window.addEventListener('error', onWindowError)
	window.addEventListener('unhandledrejection', onWindowRejection)

	return () => {
		window.removeEventListener('error', onWindowError)
		window.removeEventListener('unhandledrejection', onWindowRejection)
	}
})
</script>

{#if capturedError}
	{#if fallback}
		{@render fallback(capturedError, reset)}
	{:else}
		<div
			class="goo-error-boundary {className}"
			{style}
			role="alert"
			aria-live="assertive"
		>
			<div class="goo-error-boundary__content">
				<h2 class="goo-error-boundary__title">Something went wrong</h2>
				<p class="goo-error-boundary__message">{capturedError.message}</p>
				<button
					type="button"
					class="goo-error-boundary__retry"
					onclick={reset}
				>
					Try again
				</button>
			</div>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}
