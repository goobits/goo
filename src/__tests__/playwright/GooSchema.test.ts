import { expect, test } from '@playwright/test'

async function waitForGoo(page: import('@playwright/test').Page): Promise<void> {
	await page.waitForFunction(() => (window as { gooReady?: boolean }).gooReady === true)
}

test.describe('GooSchema', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)
		await page.evaluate(() => {
			document.getElementById('test-container')!.innerHTML = ''
		})
	})

	test('mounts the browser schema surface and exposes controller APIs', async({ page }) => {
		await page.evaluate(() => {
			const schema = (window as unknown as GooHarnessWindow).goo.createGooSchema({
				schema: [ { path: 'size', min: 0, max: 100 } ],
				data: { size: 12 }
			})
			document.getElementById('test-container')!.appendChild(schema)
		})
		await page.waitForSelector('.goo-schema .goo-controller')

		const result = await page.evaluate(() => {
			const schema = document.querySelector('.goo-schema') as GooSchemaElement | null
			const nextData = { size: 32 }
			schema?.setData(nextData)

			return {
				hasCustomElement: document.querySelector('goo-schema') !== null,
				hasController: schema?.getController('size') !== undefined,
				isConnected: schema?.isConnected,
				size: schema?.getData().size
			}
		})

		expect(result).toEqual({
			hasCustomElement: false,
			hasController: true,
			isConnected: true,
			size: 32
		})
	})
})

interface GooHarnessWindow extends Window {
	goo: {
		createGooSchema: (options?: { schema?: GooSchemaField[] | GooSchemaField, data?: Record<string, unknown> }) => GooSchemaElement
	}
}

interface GooSchemaField {
	path?: string
	min?: number
	max?: number
}

interface GooSchemaElement extends HTMLElement {
	setData(data: Record<string, unknown>): void
	getData(): Record<string, unknown>
	getController(path: string): HTMLElement | undefined
}
