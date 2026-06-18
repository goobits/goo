<script lang="ts">
import './GooVortex.css'
import type { GooVortexPoint } from './types.ts'

let { message: initialMessage = '', src = '' }: { message?: string; src?: string } = $props()

let root: HTMLDivElement | undefined = $state()
// svelte-ignore state_referenced_locally
// Intentionally seeds from the initial prop; later updates come via setMessage().
let message = $state(initialMessage)
// Named `animationState` (not `state`) so the `$state` rune token is not parsed
// as Svelte store-style access to a `state` variable by svelte-check.
let animationState = $state('')
let enterTimer: number | null = null

$effect(() => {
	return () => clearEnterTimer()
})

export function setMessage(next: string): void {
	message = next
}

export function positionAt(point: GooVortexPoint): void {
	if (!root) return
	const top = point.y - root.offsetHeight / 2
	const left = point.x - root.offsetWidth / 2
	root.style.transform = `translate(${ left }px, ${ top }px)`
}

export function enter(point: GooVortexPoint): void {
	if (root) root.style.display = 'block'
	positionAt(point)
	animationState = 'entering'
	clearEnterTimer()
	enterTimer = window.setTimeout(() => {
		if (animationState === 'entering') animationState = 'running'
		enterTimer = null
	}, 750)
}

export function exit(): void {
	clearEnterTimer()
	animationState = 'exiting'
}

function clearEnterTimer(): void {
	if (enterTimer === null) return
	window.clearTimeout(enterTimer)
	enterTimer = null
}
</script>

<div
	bind:this={root}
	class="goo-vortex"
	data-state={animationState || undefined}
	data-has-message={String(Boolean(message))}
	style="display: none"
>
	<span data-goo-vortex-message>{message}</span>
	<img src={src} alt="" draggable="false" />
</div>
