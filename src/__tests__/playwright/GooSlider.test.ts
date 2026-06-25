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

	test('animates snapped drag settling and preserves variance edge compression', async({ page }) => {
		await page.evaluate(() => {
			const goo = (window as unknown as GooHarnessWindow).goo
			const container = document.getElementById('test-container')!
			const snapSlider = goo.createSlider({
				value: 0,
				min: 0,
				max: 100,
				snap: [ 0, 50, 100 ],
				style: 'width: 220px;'
			})
			snapSlider.dataset.testid = 'snap-slider'
			container.appendChild(snapSlider)

			const varianceSlider = goo.createSlider({
				value: [ 30, 50, 70 ],
				min: 0,
				max: 100,
				mode: 'variance',
				style: 'width: 220px; margin-top: 32px;'
			})
			varianceSlider.dataset.testid = 'variance-slider'
			container.appendChild(varianceSlider)
		})

		const snapField = page.locator('[data-testid="snap-slider"]')
		const snapSlider = snapField.locator('.goo-slider')
		const snapThumb = snapSlider.locator('.goo-slider__thumb')
		const snapTrackBox = await snapSlider.locator('.goo-slider__track').boundingBox()
		const snapThumbBox = await snapThumb.boundingBox()
		expect(snapTrackBox).not.toBeNull()
		expect(snapThumbBox).not.toBeNull()

		await page.mouse.move(snapThumbBox!.x + snapThumbBox!.width / 2, snapThumbBox!.y + snapThumbBox!.height / 2)
		await page.mouse.down()
		await page.mouse.move(snapTrackBox!.x + snapTrackBox!.width * 0.6, snapTrackBox!.y + snapTrackBox!.height / 2)

		expect(await snapSlider.evaluate(element => element.classList.contains('goo-slider--snap-animate'))).toBe(true)
		expect(await snapField.evaluate(element => (element as unknown as { getValue(): number }).getValue())).toBe(50)
		await page.waitForTimeout(180)
		expect(await snapSlider.evaluate(element => element.classList.contains('goo-slider--snap-animate'))).toBe(false)
		await page.mouse.up()

		const varianceField = page.locator('[data-testid="variance-slider"]')
		const varianceSlider = varianceField.locator('.goo-slider')
		const varianceTrackBox = await varianceSlider.locator('.goo-slider__track').boundingBox()
		const varianceBaseBox = await varianceSlider.locator('.goo-slider__thumb--variance-base').boundingBox()
		expect(varianceTrackBox).not.toBeNull()
		expect(varianceBaseBox).not.toBeNull()

		await page.mouse.move(varianceBaseBox!.x + varianceBaseBox!.width / 2, varianceBaseBox!.y + varianceBaseBox!.height / 2)
		await page.mouse.down()
		await page.mouse.move(varianceTrackBox!.x, varianceTrackBox!.y + varianceTrackBox!.height / 2)
		await page.mouse.up()

		expect(await varianceField.evaluate(element => (element as unknown as { getValue(): number[] }).getValue())).toEqual([ 0, 0, 20 ])
	})
})

interface GooHarnessWindow extends Window {
	goo: {
		createSlider(options?: Record<string, unknown>): HTMLElement
	}
}
