import { expect, test } from '@playwright/test'

async function waitForGoo(page: import('@playwright/test').Page): Promise<void> {
	await page.waitForFunction(() => (window as { gooReady?: boolean }).gooReady === true)
}

test.describe('GooSlider', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)
		await page.evaluate(() => {
			document.getElementById('test-container')!.innerHTML = ''
		})
	})

	test('renders variance, marks, bubbles, and vertical diamonds', async({ page }) => {
		await page.evaluate(() => {
			const goo = (window as unknown as GooHarnessWindow).goo
			const container = document.getElementById('test-container')!
			const row = document.createElement('div')
			row.style.display = 'flex'
			row.style.gap = '48px'
			row.style.height = '180px'
			row.style.width = '640px'
			container.appendChild(row)
			row.appendChild(goo.createSlider({
				value: [ 80, 100, 100 ],
				mode: 'variance',
				valueBubble: 'always',
				style: 'width: 220px;'
			}))
			row.appendChild(goo.createSlider({
				value: 50,
				ticks: 4,
				marks: [ { value: 0, label: '0' }, { value: 100, label: '100' } ],
				snap: true,
				style: 'width: 220px;'
			}))
			row.appendChild(goo.createSlider({
				value: [ 25, 50, 75 ],
				mode: 'variance',
				direction: 'vertical',
				style: 'height: 140px;'
			}))
		})

		await expect(page.locator('.goo-slider--variance')).toHaveCount(2)
		await expect(page.locator('.goo-slider__mark')).toHaveCount(5)
		await expect(page.locator('.goo-slider__mark-label')).toHaveText([ '0', '100' ])
		await expect(page.locator('.goo-slider__value-bubble')).toHaveText([ '80', '100', '100' ])

		const verticalControlStyle = await page.locator('.goo-slider--vertical .goo-slider__thumb--variance-control').first().evaluate(element => {
			const style = getComputedStyle(element)
			return {
				clipPath: style.clipPath,
				transform: style.transform
			}
		})
		expect(verticalControlStyle.clipPath).toBe('none')
		expect(verticalControlStyle.transform).toContain('matrix')
	})
})

interface GooHarnessWindow extends Window {
	goo: {
		createSlider(options?: Record<string, unknown>): HTMLElement
	}
}
