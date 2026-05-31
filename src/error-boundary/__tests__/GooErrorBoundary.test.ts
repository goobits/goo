import { fireEvent, render } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooErrorBoundary from '../GooErrorBoundary.svelte'
import { GooErrorBoundary as ExportedGooErrorBoundary } from '../index.js'

const childrenSnippet = createRawSnippet(() => ({
	render: () => '<p data-testid="children">healthy</p>'
}))

describe('GooErrorBoundary', () => {
	it('exports the Svelte component as the boundary surface', () => {
		expect(ExportedGooErrorBoundary).toBe(GooErrorBoundary)
	})

	it('renders children when no error has been captured', () => {
		const { container } = render(GooErrorBoundary, {
			props: {
				children: childrenSnippet
			}
		})

		expect(container.querySelector('[data-testid="children"]')?.textContent).toBe('healthy')
		expect(container.querySelector('.goo-error-boundary')).toBeNull()
	})

	it('shows the default fallback when window emits an error event', async() => {
		const { container } = render(GooErrorBoundary, {
			props: {
				children: childrenSnippet
			}
		})

		const event = new ErrorEvent('error', {
			message: 'boom',
			error: new Error('boom')
		})
		window.dispatchEvent(event)
		await Promise.resolve()

		const boundary = container.querySelector('.goo-error-boundary')
		expect(boundary).not.toBeNull()
		expect(boundary?.getAttribute('role')).toBe('alert')
		expect(container.querySelector('.goo-error-boundary__message')?.textContent).toBe('boom')
	})

	it('captures unhandled promise rejections', async() => {
		const onError = vi.fn()
		const { container } = render(GooErrorBoundary, {
			props: {
				children: childrenSnippet,
				onError
			}
		})

		const rejection = new PromiseRejectionEvent('unhandledrejection', {
			promise: Promise.reject(new Error('promise-boom')),
			reason: new Error('promise-boom')
		})

		// Prevent the actual unhandled rejection from polluting the test runner.
		rejection.promise.catch(() => {})
		window.dispatchEvent(rejection)
		await Promise.resolve()

		expect(onError).toHaveBeenCalledOnce()
		expect(onError.mock.calls[0]?.[0]?.message).toBe('promise-boom')
		expect(container.querySelector('.goo-error-boundary__message')?.textContent).toBe('promise-boom')
	})

	it('reset clears the error and re-renders children', async() => {
		const { container } = render(GooErrorBoundary, {
			props: {
				children: childrenSnippet
			}
		})

		window.dispatchEvent(new ErrorEvent('error', {
			message: 'temporary',
			error: new Error('temporary')
		}))
		await Promise.resolve()

		const retry = container.querySelector('.goo-error-boundary__retry') as HTMLButtonElement
		expect(retry).not.toBeNull()
		await fireEvent.click(retry)

		expect(container.querySelector('.goo-error-boundary')).toBeNull()
		expect(container.querySelector('[data-testid="children"]')?.textContent).toBe('healthy')
	})

	it('renders a custom fallback snippet when provided', async() => {
		const fallback = createRawSnippet((errorAccessor: () => Error) => ({
			render: () => `<div data-testid="fallback">caught: ${ errorAccessor().message }</div>`
		}))

		const { container } = render(GooErrorBoundary, {
			props: {
				children: childrenSnippet,
				fallback
			}
		})

		window.dispatchEvent(new ErrorEvent('error', {
			message: 'custom',
			error: new Error('custom')
		}))
		await Promise.resolve()

		expect(container.querySelector('[data-testid="fallback"]')?.textContent).toBe('caught: custom')

		// Default fallback markup must NOT appear when a snippet is provided.
		expect(container.querySelector('.goo-error-boundary')).toBeNull()
	})
})
