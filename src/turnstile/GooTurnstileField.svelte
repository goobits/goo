<script lang="ts">
import './GooTurnstileField.css'
import { untrack } from 'svelte'

import {
	ensureTurnstileScript,
	type GooTurnstileApi
} from './_scriptLoader.ts'
import type { GooTurnstileError, GooTurnstileFieldProps } from './types.ts'

const UNOBSERVED_RESET_SIGNAL = Symbol('unobserved-reset-signal')

let {
	siteKey = '',
	action,
	cData,
	theme = 'auto',
	size = 'normal',
	resetSignal = undefined,
	onReady,
	onToken,
	onExpired,
	onError,
	label = 'Security verification',
	class: className = '',
	style
}: GooTurnstileFieldProps = $props()

let container: HTMLDivElement | undefined = $state()
let widgetId: string | undefined
let turnstileApi: GooTurnstileApi | undefined
let status: 'loading' | 'ready' | 'error' = $state('loading')
let previousResetSignal: unknown | typeof UNOBSERVED_RESET_SIGNAL = UNOBSERVED_RESET_SIGNAL

function reportError(error: GooTurnstileError): void {
	status = 'error'
	untrack(() => onError?.(error))
}

function handleResetSignal(nextResetSignal: unknown): void {
	if (previousResetSignal === UNOBSERVED_RESET_SIGNAL) {
		previousResetSignal = nextResetSignal
		return
	}
	if (Object.is(nextResetSignal, previousResetSignal)) return
	previousResetSignal = nextResetSignal

	untrack(() => {
		if (!widgetId || !turnstileApi?.reset) return
		status = 'ready'
		turnstileApi.reset(widgetId)
	})
}

$effect(() => {
	const target = container
	const nextSiteKey = siteKey
	const nextAction = action
	const nextCData = cData
	const nextTheme = theme
	const nextSize = size
	if (!nextSiteKey || !target) return

	let active = true
	let frameId: number | undefined
	let ownedApi: GooTurnstileApi | undefined
	let ownedWidgetId: string | undefined
	status = 'loading'

	const initialize = async() => {
		await new Promise<void>(resolve => {
			frameId = requestAnimationFrame(() => {
				frameId = undefined
				resolve()
			})
		})
		if (!active) return

		let api: GooTurnstileApi
		try {
			api = await ensureTurnstileScript()
		} catch (error) {
			if (!active) return
			reportError({
				source: 'script',
				error: error instanceof Error ? error : new Error(String(error))
			})
			return
		}
		if (!active) return

		try {
			ownedApi = api
			ownedWidgetId = api.render(target, {
				sitekey: nextSiteKey,
				...(nextAction === undefined ? {} : { action: nextAction }),
				...(nextCData === undefined ? {} : { cData: nextCData }),
				theme: nextTheme,
				size: nextSize,
				callback: token => {
					if (active) untrack(() => onToken?.(token))
				},
				'error-callback': code => {
					if (active) reportError({ source: 'widget', code: String(code) })
					return true
				},
				'expired-callback': () => {
					if (active) untrack(() => onExpired?.())
				}
			})
			if (!active) {
				api.remove?.(ownedWidgetId)
				return
			}
			turnstileApi = api
			widgetId = ownedWidgetId
			status = 'ready'
			untrack(() => onReady?.())
		} catch (error) {
			if (!active) return
			reportError({
				source: 'render',
				error: error instanceof Error ? error : new Error(String(error))
			})
		}
	}

	void initialize()

	return () => {
		active = false
		if (frameId !== undefined) cancelAnimationFrame(frameId)
		if (ownedApi && ownedWidgetId) ownedApi.remove?.(ownedWidgetId)
		if (widgetId === ownedWidgetId) {
			widgetId = undefined
			turnstileApi = undefined
		}
	}
})

$effect(() => {
	handleResetSignal(resetSignal)
})
</script>

{#if siteKey}
	<div
		class="goo-turnstile-field {className}"
		{style}
		role="group"
		aria-label={label}
		data-turnstile-state={status}
	>
		<div bind:this={container} class="goo-turnstile-field__widget"></div>
	</div>
{/if}
