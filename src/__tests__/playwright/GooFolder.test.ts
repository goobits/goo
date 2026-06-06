import { expect, test } from '@playwright/test'

async function waitForGoo(page: import('@playwright/test').Page): Promise<void> {
	await page.waitForFunction(() => (window as { gooReady?: boolean }).gooReady === true)
}

test.describe('GooFolder', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)
		await page.evaluate(() => {
			document.getElementById('test-container')!.innerHTML = ''
		})
	})

	test('nested folder header clicks toggle only the nested folder', async({ page }) => {
		await page.evaluate(() => {
			const parent = (window as unknown as GooHarnessWindow).goo.createFolder({ title: 'Parent' })
			document.getElementById('test-container')!.appendChild(parent)
			parent.addFolder('Child')
		})

		await page.click('.goo-folder .goo-folder .goo-folder__header')

		const states = await page.evaluate(() => {
			const folders = document.querySelectorAll('.goo-folder') as NodeListOf<GooFolderElement>
			return {
				childOpen: folders[1]?.open,
				parentOpen: folders[0]?.open
			}
		})

		expect(states).toEqual({
			childOpen: false,
			parentOpen: true
		})
	})
})

interface GooHarnessWindow extends Window {
	goo: {
		createFolder: (options?: { title?: string, open?: boolean }) => GooFolderElement
	}
}

interface GooFolderElement extends HTMLElement {
	open: boolean
	addFolder(title: string): GooFolderElement
}
