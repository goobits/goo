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

	test('supports direct keyboard navigation without stealing input keys', async({ page }) => {
		await page.evaluate(() => {
			const schema = (window as unknown as GooHarnessWindow).goo.createGooSchema({
				schema: [
					{
						type: 'folder',
						title: 'Shape',
						open: true,
						children: [
							{ path: 'size', min: 0, max: 100 },
							{ path: 'name' }
						]
					}
				],
				data: { size: 12, name: 'Marker' },
				bare: true
			})
			document.getElementById('test-container')!.appendChild(schema)
		})
		await page.waitForSelector('.goo-schema .goo-folder__header')
		await page.waitForSelector('.goo-schema .goo-input__content')

		const schema = page.locator('.goo-schema').first()
		const folderHeader = page.locator('.goo-schema .goo-folder__header').first()
		const textInput = page.locator('.goo-schema .goo-input__content').first()

		await schema.focus()
		await expect(schema).toBeFocused()
		await page.keyboard.press('ArrowDown')
		await expect(folderHeader).toBeFocused()

		await textInput.focus()
		await page.keyboard.press('Home')
		await expect(textInput).toBeFocused()
	})
})

interface GooHarnessWindow extends Window {
	goo: {
		createGooSchema: (options?: {
			bare?: boolean
			data?: Record<string, unknown>
			schema?: GooSchemaField[] | GooSchemaField
		}) => GooSchemaElement
	}
}

interface GooSchemaField {
	children?: GooSchemaField[]
	path?: string
	open?: boolean
	min?: number
	max?: number
	title?: string
	type?: string
}

interface GooSchemaElement extends HTMLElement {
	setData(data: Record<string, unknown>): void
	getData(): Record<string, unknown>
	getController(path: string): HTMLElement | undefined
}
