import { expect, test } from '@playwright/test'

test.describe('Goo input geometry', () => {
	test('keeps the native input inside its control surface', async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await page.waitForFunction(() => (window as unknown as GooHarnessWindow).gooReady === true)

		const dimensions = await page.evaluate(async() => {
			document.documentElement.style.setProperty('--goo-theme-control-height-md', '36px')
			document.documentElement.style.setProperty('--goo-theme-control-padding-md', '8px 12px')
			document.documentElement.style.setProperty('--goo-theme-font-size-sm', '14px')
			document.documentElement.style.setProperty('--goo-theme-line-height-base', '1.5')

			const input = (window as unknown as GooHarnessWindow).goo.createInput()
			document.getElementById('test-container')!.appendChild(input)
			await new Promise(requestAnimationFrame)

			const control = input.querySelector<HTMLElement>('.goo-input')!
			const content = input.querySelector<HTMLInputElement>('.goo-input__content')!
			return {
				contentHeight: content.getBoundingClientRect().height,
				controlHeight: control.getBoundingClientRect().height
			}
		})

		expect(dimensions.controlHeight).toBe(36)
		expect(dimensions.contentHeight).toBe(dimensions.controlHeight)
	})
})

interface GooHarnessWindow extends Window {
	gooReady?: boolean
	goo: {
		createInput(): HTMLElement
	}
}
