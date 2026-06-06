import { render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { _resetTurnstileLoaderForTests } from '../_script-loader.ts'
import GooTurnstileField from '../GooTurnstileField.svelte'

const SCRIPT_ID = 'goo-turnstile-script'

function cleanupScript(): void {
	document.getElementById(SCRIPT_ID)?.remove()
	_resetTurnstileLoaderForTests()
}

describe('GooTurnstileField', () => {
	beforeEach(() => {
		cleanupScript()
	})

	afterEach(() => {
		cleanupScript()
	})

	it('renders nothing when siteKey is empty', () => {
		const { container } = render(GooTurnstileField, {
			props: { siteKey: '' }
		})

		expect(container.querySelector('.goo-turnstile-field')).toBeNull()
		expect(container.querySelector('.cf-turnstile')).toBeNull()
		expect(document.getElementById(SCRIPT_ID)).toBeNull()
	})

	it('renders the cf-turnstile div with forwarded data attributes', async() => {
		const { container } = render(GooTurnstileField, {
			props: {
				siteKey: 'fake-site-key',
				action: 'contact',
				theme: 'dark',
				size: 'compact',
				cData: 'session-123'
			}
		})

		await Promise.resolve()

		const widget = container.querySelector('.cf-turnstile')
		expect(widget).not.toBeNull()
		expect(widget?.getAttribute('data-sitekey')).toBe('fake-site-key')
		expect(widget?.getAttribute('data-action')).toBe('contact')
		expect(widget?.getAttribute('data-theme')).toBe('dark')
		expect(widget?.getAttribute('data-size')).toBe('compact')
		expect(widget?.getAttribute('data-cdata')).toBe('session-123')
	})

	it('injects the Turnstile script tag exactly once across multiple instances', async() => {
		render(GooTurnstileField, { props: { siteKey: 'k1' } })
		render(GooTurnstileField, { props: { siteKey: 'k2' } })
		render(GooTurnstileField, { props: { siteKey: 'k3' } })

		await Promise.resolve()

		const scripts = document.querySelectorAll(`script#${ SCRIPT_ID }`)
		expect(scripts.length).toBe(1)
		expect(scripts[0]?.getAttribute('src')).toBe(
			'https://challenges.cloudflare.com/turnstile/v0/api.js'
		)
	})

	it('does not inject a script when siteKey is missing', async() => {
		render(GooTurnstileField, { props: { siteKey: '' } })

		await Promise.resolve()

		expect(document.getElementById(SCRIPT_ID)).toBeNull()
	})

	it('omits data-action/data-cdata/data-size when not provided', async() => {
		const { container } = render(GooTurnstileField, {
			props: { siteKey: 'fake-site-key' }
		})

		await Promise.resolve()

		const widget = container.querySelector('.cf-turnstile')
		expect(widget?.hasAttribute('data-action')).toBe(false)
		expect(widget?.hasAttribute('data-cdata')).toBe(false)
		expect(widget?.hasAttribute('data-size')).toBe(false)

		// theme has a default — should always be present
		expect(widget?.getAttribute('data-theme')).toBe('auto')
	})
})
