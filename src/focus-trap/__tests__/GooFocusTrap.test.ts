import { render } from '@testing-library/svelte'
import { createRawSnippet, tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { activateModalIsolation } from '../../support/keyboard/_focus.ts'
import GooFocusTrap from '../GooFocusTrap.svelte'

const trapChildren = createRawSnippet(() => ({
	render: () => `
		<div>
			<button type="button" data-focus="first">First</button>
			<button type="button" data-focus="last">Last</button>
		</div>
	`
}))

describe('GooFocusTrap', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('isolates the modal, traps Tab, and restores previous focus on unmount', async() => {
		const appRoot = document.createElement('main')
		const opener = document.createElement('button')
		appRoot.append(opener)
		document.body.append(appRoot)
		opener.focus()

		const { container, unmount } = render(GooFocusTrap, {
			props: {
				ariaLabel: 'Modal tools',
				children: trapChildren,
				'data-testid': 'modal-tools'
			}
		})
		await tick()
		await Promise.resolve()
		const root = container.querySelector<HTMLElement>('[role="dialog"]')!
		const first = container.querySelector<HTMLElement>('[data-focus="first"]')!
		const last = container.querySelector<HTMLElement>('[data-focus="last"]')!

		expect(document.activeElement).toBe(first)
		expect(root.getAttribute('aria-modal')).toBe('true')
		expect(root.getAttribute('data-testid')).toBe('modal-tools')
		expect(appRoot.inert).toBe(true)
		expect(appRoot.getAttribute('aria-hidden')).toBe('true')

		last.focus()
		const tabEvent = dispatchTrapKey(last, 'Tab')

		expect(tabEvent.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(first)

		first.focus()
		const shiftTabEvent = dispatchTrapKey(first, 'Tab', { shiftKey: true })

		expect(shiftTabEvent.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(last)

		unmount()

		expect(appRoot.inert).toBe(false)
		expect(appRoot.getAttribute('aria-hidden')).toBeNull()
		expect(document.activeElement).toBe(opener)
	})

	it('isolates sibling branches when the modal is nested in the application shell', () => {
		const appRoot = document.createElement('main')
		const background = document.createElement('button')
		const modalHost = document.createElement('section')
		const modal = document.createElement('div')
		modalHost.append(modal)
		appRoot.append(background, modalHost)
		document.body.append(appRoot)

		const isolation = activateModalIsolation({ modal })

		expect(appRoot.inert).not.toBe(true)
		expect(modalHost.inert).not.toBe(true)
		expect(background.inert).toBe(true)
		expect(background.getAttribute('aria-hidden')).toBe('true')

		isolation.detach()

		expect(background.inert).toBe(false)
		expect(background.getAttribute('aria-hidden')).toBeNull()
	})
})

function dispatchTrapKey(
	element: HTMLElement,
	key: string,
	options: { shiftKey?: boolean } = {}
): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key,
		shiftKey: options.shiftKey
	})
	element.dispatchEvent(event)
	return event
}
