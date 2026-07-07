<script lang="ts">
import './GooToast.css'
import type { GooToastProps } from './types.ts'

let {
	toast,
	ondismiss,
	class: className = ''
}: GooToastProps = $props()

const hasAutoDismiss = $derived(toast.duration > 0)

// Errors/warnings interrupt assertively; info/success announce politely.
const isUrgent = $derived(toast.variant === 'error' || toast.variant === 'warning')

// svelte-ignore state_referenced_locally
// The `toast` prop is stable for this component's lifetime; the queue creates a
// new component instance when a toast is added/replaced. Capturing the initial
// duration is intentional.
let remainingMs = $state(toast.duration)
let isPaused = $state(false)
let lastResumeAt = $state(Date.now())
let frameHandle: number | null = null

function scheduleFrame(): void {
	if (frameHandle !== null) return
	frameHandle = requestAnimationFrame(tick)
}

function cancelFrame(): void {
	if (frameHandle === null) return
	cancelAnimationFrame(frameHandle)
	frameHandle = null
}

function tick(): void {
	frameHandle = null
	if (!hasAutoDismiss || isPaused) return

	const now = Date.now()
	const elapsed = now - lastResumeAt
	remainingMs = Math.max(0, remainingMs - elapsed)
	lastResumeAt = now

	if (remainingMs <= 0) {
		ondismiss(toast.id)
		return
	}

	scheduleFrame()
}

function pause(): void {
	if (!hasAutoDismiss || isPaused) return
	const now = Date.now()
	const elapsed = now - lastResumeAt
	remainingMs = Math.max(0, remainingMs - elapsed)
	isPaused = true
	cancelFrame()
}

function resume(): void {
	if (!hasAutoDismiss || !isPaused) return
	isPaused = false
	lastResumeAt = Date.now()
	scheduleFrame()
}

function handleDismiss(): void {
	cancelFrame()
	ondismiss(toast.id)
}

function handleActionClick(): void {
	toast.action?.onClick()
	cancelFrame()
	ondismiss(toast.id)
}

$effect(() => {
	if (!hasAutoDismiss) return
	lastResumeAt = Date.now()
	scheduleFrame()
	return cancelFrame
})

const progressPercent = $derived(
	hasAutoDismiss ? Math.max(0, Math.min(100, (remainingMs / toast.duration) * 100)) : 0
)
</script>

<div
	class="goo-toast goo-toast--{ toast.variant } { className }"
	role={isUrgent ? 'alert' : 'status'}
	aria-live={isUrgent ? 'assertive' : 'polite'}
	aria-atomic="true"
	onmouseenter={pause}
	onmouseleave={resume}
	onfocusin={pause}
	onfocusout={resume}
>
	<span class="goo-toast__icon" aria-hidden="true">{toast.icon}</span>

	<div class="goo-toast__body">
		<div class="goo-toast__title">{toast.title}</div>
		{#if toast.message}
			<div class="goo-toast__message">{toast.message}</div>
		{/if}
		{#if toast.action}
			<button
				type="button"
				class="goo-toast__action"
				onclick={handleActionClick}
			>
				{toast.action.label}
			</button>
		{/if}
	</div>

	{#if toast.dismissible}
		<button
			type="button"
			class="goo-toast__dismiss"
			aria-label="Dismiss notification"
			onclick={handleDismiss}
		>
			×
		</button>
	{/if}

	{#if hasAutoDismiss}
		<div
			class="goo-toast__progress"
			style:width="{ progressPercent }%"
			aria-hidden="true"
		></div>
	{/if}
</div>
