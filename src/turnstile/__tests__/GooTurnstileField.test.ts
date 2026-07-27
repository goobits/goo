import { render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	_resetTurnstileLoaderForTests,
	type GooTurnstileApi,
	type GooTurnstileRenderOptions
} from '../_scriptLoader.ts'
import GooTurnstileField from '../GooTurnstileField.svelte'
import type { GooTurnstileError } from '../types.ts'
import TurnstileResetHost from './TurnstileResetHost.svelte'

const SCRIPT_ID = 'goo-turnstile-script'

type TestWindow = Window &
	typeof globalThis & {
		turnstile?: GooTurnstileApi
		trustedTypes?: unknown
	}

function testWindow(): TestWindow {
	return window as TestWindow
}

function cleanupBrowserState(): void {
	document.getElementById(SCRIPT_ID)?.remove()
	_resetTurnstileLoaderForTests()
	delete testWindow().turnstile
	delete testWindow().trustedTypes
}

function installApi(overrides: Partial<GooTurnstileApi> = {}): {
	api: GooTurnstileApi
	render: ReturnType<typeof vi.fn<(element: HTMLElement, options: GooTurnstileRenderOptions) => string>>
	remove: ReturnType<typeof vi.fn<(widgetId: string) => void>>
	reset: ReturnType<typeof vi.fn<(widgetId: string) => void>>
} {
	const renderWidget = vi.fn<(element: HTMLElement, options: GooTurnstileRenderOptions) => string>(
		() => 'widget-1'
	)
	const remove = vi.fn<(widgetId: string) => void>()
	const reset = vi.fn<(widgetId: string) => void>()
	const api: GooTurnstileApi = {
		render: renderWidget,
		remove,
		reset,
		...overrides
	}
	testWindow().turnstile = api
	return { api, render: renderWidget, remove, reset }
}

async function renderedOptions(
	renderWidget: ReturnType<
		typeof vi.fn<(element: HTMLElement, options: GooTurnstileRenderOptions) => string>
	>
): Promise<GooTurnstileRenderOptions> {
	await waitFor(() => expect(renderWidget).toHaveBeenCalledOnce())
	const options = renderWidget.mock.calls[0]?.[1]
	if (!options) throw new Error('Turnstile render options were not captured')
	return options
}

describe('GooTurnstileField', () => {
	beforeEach(() => {
		cleanupBrowserState()
		let nextFrameId = 0
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			callback(0)
			nextFrameId += 1
			return nextFrameId
		})
		vi.stubGlobal('cancelAnimationFrame', vi.fn())
	})

	afterEach(() => {
		cleanupBrowserState()
		vi.unstubAllGlobals()
	})

	it('renders nothing and loads no script when siteKey is empty', () => {
		const { container } = render(GooTurnstileField, {
			props: { siteKey: '' }
		})

		expect(container.querySelector('.goo-turnstile-field')).toBeNull()
		expect(document.getElementById(SCRIPT_ID)).toBeNull()
	})

	it('renders the explicit widget with forwarded configuration and callbacks', async() => {
		const { render: renderWidget } = installApi()
		const onReady = vi.fn()
		const onToken = vi.fn()
		const onExpired = vi.fn()
		const onError = vi.fn<(error: GooTurnstileError) => void>()
		const { container } = render(GooTurnstileField, {
			props: {
				siteKey: 'fake-site-key',
				action: 'contact',
				theme: 'dark',
				size: 'compact',
				cData: 'session-123',
				onReady,
				onToken,
				onExpired,
				onError
			}
		})

		const options = await renderedOptions(renderWidget)
		expect(renderWidget.mock.calls[0]?.[0]).toBe(
			container.querySelector('.goo-turnstile-field__widget')
		)
		expect(options).toMatchObject({
			sitekey: 'fake-site-key',
			action: 'contact',
			theme: 'dark',
			size: 'compact',
			cData: 'session-123'
		})
		expect(onReady).toHaveBeenCalledOnce()
		expect(
			container.querySelector('.goo-turnstile-field')?.getAttribute('data-turnstile-state')
		).toBe('ready')

		options.callback?.('fresh-token')
		options['expired-callback']?.()
		expect(onToken).toHaveBeenCalledWith('fresh-token')
		expect(onExpired).toHaveBeenCalledOnce()

		expect(options['error-callback']?.('200500')).toBe(true)
		expect(onError).toHaveBeenCalledWith({ source: 'widget', code: '200500' })
		await waitFor(() => {
			expect(
				container.querySelector('.goo-turnstile-field')?.getAttribute('data-turnstile-state')
			).toBe('error')
		})
	})

	it('resets the rendered widget when resetSignal changes', async() => {
		const { render: renderWidget, reset } = installApi()
		const view = render(TurnstileResetHost)
		await renderedOptions(renderWidget)

		view.component.issueReset()

		await waitFor(() => expect(reset).toHaveBeenCalledWith('widget-1'))
		expect(reset).toHaveBeenCalledOnce()
	})

	it('removes the owned widget when the component unmounts', async() => {
		const { render: renderWidget, remove } = installApi()
		const view = render(GooTurnstileField, {
			props: { siteKey: 'fake-site-key' }
		})
		await renderedOptions(renderWidget)

		view.unmount()

		expect(remove).toHaveBeenCalledWith('widget-1')
		expect(remove).toHaveBeenCalledOnce()
	})

	it('reports render failures without leaving the component ready', async() => {
		const renderFailure = new Error('render-failed')
		const onError = vi.fn<(error: GooTurnstileError) => void>()
		installApi({
			render: () => {
				throw renderFailure
			}
		})
		const { container } = render(GooTurnstileField, {
			props: { siteKey: 'fake-site-key', onError }
		})

		await waitFor(() => {
			expect(onError).toHaveBeenCalledWith({ source: 'render', error: renderFailure })
		})
		expect(
			container.querySelector('.goo-turnstile-field')?.getAttribute('data-turnstile-state')
		).toBe('error')
	})

	it('injects one explicit-rendering script across concurrent instances', async() => {
		render(GooTurnstileField, { props: { siteKey: 'k1' } })
		render(GooTurnstileField, { props: { siteKey: 'k2' } })
		render(GooTurnstileField, { props: { siteKey: 'k3' } })

		await waitFor(() => {
			expect(document.querySelectorAll(`script#${ SCRIPT_ID }`)).toHaveLength(1)
		})
		expect(document.getElementById(SCRIPT_ID)?.getAttribute('src')).toBe(
			'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
		)
	})

	it('reports script failures and permits a later load retry', async() => {
		const onError = vi.fn<(error: GooTurnstileError) => void>()
		const first = render(GooTurnstileField, {
			props: { siteKey: 'fake-site-key', onError }
		})
		const script = await waitFor(() => {
			const element = document.getElementById(SCRIPT_ID)
			expect(element).not.toBeNull()
			return element
		})
		script.dispatchEvent(new Event('error'))

		await waitFor(() => expect(onError).toHaveBeenCalledOnce())
		expect(onError.mock.calls[0]?.[0]).toMatchObject({ source: 'script' })
		expect(document.getElementById(SCRIPT_ID)).toBeNull()

		first.unmount()
		render(GooTurnstileField, { props: { siteKey: 'retry-key' } })
		await waitFor(() => expect(document.getElementById(SCRIPT_ID)).not.toBeNull())
	})

	it('creates the single CSP-compatible Trusted Types policy', async() => {
		const createScriptURL = vi.fn((input: string) => input)
		const createPolicy = vi.fn(() => ({ createScriptURL }))
		testWindow().trustedTypes = { createPolicy }

		render(GooTurnstileField, { props: { siteKey: 'fake-site-key' } })

		await waitFor(() => expect(document.getElementById(SCRIPT_ID)).not.toBeNull())
		expect(createPolicy).toHaveBeenCalledWith('goo-turnstile', {
			createScriptURL: expect.any(Function)
		})
		expect(createScriptURL).toHaveBeenCalledWith(
			'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
		)
	})
})
