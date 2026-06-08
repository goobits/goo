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

	test('closed inspector folders do not leak content into scrollable overflow', async({ page }) => {
		const metrics = await page.evaluate(() => {
			const style = document.createElement('style')
			style.textContent = '.goo-folder__content { transition: none !important; }'
			document.head.appendChild(style)

			const scroller = document.createElement('div')
			scroller.style.height = '80px'
			scroller.style.overflow = 'auto'
			scroller.style.width = '240px'
			document.getElementById('test-container')!.appendChild(scroller)

			const folder = (window as unknown as GooHarnessWindow).goo.createFolder({
				title: 'Paint',
				open: false,
				className: 'goo-folder--inspector'
			})
			scroller.appendChild(folder)

			const tallChild = document.createElement('div')
			tallChild.style.height = '600px'
			tallChild.textContent = 'Closed content'
			folder.add(tallChild)

			const closed = {
				clientHeight: scroller.clientHeight,
				scrollHeight: scroller.scrollHeight
			}

			folder.expand()
			const open = {
				clientHeight: scroller.clientHeight,
				scrollHeight: scroller.scrollHeight
			}

			return { closed, open }
		})

		expect(metrics.closed.scrollHeight).toBe(metrics.closed.clientHeight)
		expect(metrics.open.scrollHeight).toBeGreaterThan(metrics.open.clientHeight)
	})
})

interface GooHarnessWindow extends Window {
	goo: {
		createFolder: (options?: { title?: string, open?: boolean, className?: string }) => GooFolderElement
	}
}

interface GooFolderElement extends HTMLElement {
	open: boolean
	add(element: HTMLElement): HTMLElement
	addFolder(title: string): GooFolderElement
	expand(): void
}
