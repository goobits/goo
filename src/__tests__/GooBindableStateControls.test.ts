import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import BindableStateControlsHost from './BindableStateControlsHost.svelte'

const nextAnimationFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)) // test-shape: timing-probe - documented test timing behavior.

describe('Goo bindable state controls', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-dialog, .goo-dialog-backdrop, .goo-popout').forEach(element => element.remove())
	})

	it('updates bound toggle and disclosure state', async() => {
		const { container } = render(BindableStateControlsHost)

		const button = container.querySelector<HTMLButtonElement>('.goo-button')!
		await fireEvent.click(button)
		await tick()
		expect(screen.getByTestId('button-pressed').textContent).toBe('true')

		const folderToggle = container.querySelector<HTMLButtonElement>('.goo-folder__header')!
		await fireEvent.click(folderToggle)
		await tick()
		expect(screen.getByTestId('folder-open').textContent).toBe('false')

		const panelToggle = container.querySelector<HTMLButtonElement>('.goo-panel__toggle')!
		await fireEvent.click(panelToggle)
		await tick()
		expect(screen.getByTestId('panel-open').textContent).toBe('false')
	})

	it('updates bound overlay state when popouts and dialogs open or close', async() => {
		render(BindableStateControlsHost)
		await tick()

		expect(screen.getByTestId('popout-open').textContent).toBe('true')

		await fireEvent.click(screen.getByTestId('close-popout'))
		await nextAnimationFrame()
		await tick()
		expect(screen.getByTestId('popout-open').textContent).toBe('false')

		await fireEvent.click(screen.getByTestId('open-dialog'))
		await nextAnimationFrame()
		await tick()
		expect(screen.getByTestId('dialog-open').textContent).toBe('true')

		const closeButton = document.querySelector<HTMLButtonElement>('.goo-dialog__close-badge')
		expect(closeButton).toBeInstanceOf(HTMLButtonElement)
		closeButton.click()
		await delay(320)
		await tick()
		expect(screen.getByTestId('dialog-open').textContent).toBe('false')
	})
})
