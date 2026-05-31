/**
 * Goo value setter tests - ensure programmatic sets are silent.
 */

import { expect, test } from '@playwright/test'

async function waitForGoo(page: import('@playwright/test').Page) {
	await page.waitForFunction(() => window.gooReady === true)
}

test.describe('Goo value setters', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)

		await page.evaluate(() => {
			document.getElementById('test-container')!.innerHTML = ''
		})
	})

	test('setting value does not emit change or input', async({ page }) => {
		const results = await page.evaluate(async() => {
			const container = document.getElementById('test-container')!
			const waitFrame = () => new Promise(requestAnimationFrame)
			const cases = [
				{ name: 'goo-color', create: () => (window.goo as typeof window.goo & { createColor: () => HTMLElement }).createColor() as HTMLElement & { value: unknown }, value: '#ff0000' },
				{ name: 'goo-slider', create: () => (window.goo as typeof window.goo & { createSlider: () => HTMLElement }).createSlider() as HTMLElement & { value: unknown }, value: 42 },
				{ name: 'goo-input', create: () => (window.goo as typeof window.goo & { createInput: () => HTMLElement }).createInput() as HTMLElement & { value: unknown }, value: 'hello' },
				{ name: 'goo-checkbox', create: () => window.goo.createCheckbox() as HTMLElement & { value: unknown }, value: true }
			]
			const output: Array<{ name: string; changeCount: number; inputCount: number }> = []

			for (const spec of cases) {
				const el = spec.create()
				let changeCount = 0
				let inputCount = 0

				el.addEventListener('change', () => {
					changeCount++
				})
				el.addEventListener('input', () => {
					inputCount++
				})

				container.appendChild(el)
				el.value = spec.value
				await waitFrame()

				output.push({ name: spec.name, changeCount, inputCount })
				el.remove()
			}

			return output
		})

		for (const result of results) {
			expect(result.changeCount, `${ result.name } change`).toBe(0)
			expect(result.inputCount, `${ result.name } input`).toBe(0)
		}
	})
})
