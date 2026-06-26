import { expect, type Locator, type Page, test } from '@playwright/test'

async function waitForGoo(page: Page): Promise<void> {
	await page.waitForFunction(() => (window as { gooReady?: boolean }).gooReady === true)
}

test.describe('GooContextMenu', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)
		await page.evaluate(async() => {
			document.getElementById('test-container')!.innerHTML = ''
			document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		})
	})

	test('keeps opt-in highlighted shortcut color stable before and after pointer hover', async({ page }) => {
		await page.evaluate(async() => {
			document.documentElement.style.setProperty('--goo-theme-accent', '#f4d35e')
			document.documentElement.style.setProperty('--goo-theme-accent-fg', '#111111')
			document.documentElement.style.setProperty('--goo-theme-fg', '#ffffff')
			document.documentElement.style.setProperty('--goo-theme-bg', '#202124')

			const goo = (window as unknown as GooHarnessWindow).goo
			const container = document.getElementById('test-container')!
			const menu = goo.createGooContextMenu({
				options: [
					{ id: 'copy', label: 'Copy', shortcut: [ '⌘', 'C' ] },
					{ id: 'paste', label: 'Paste', shortcut: [ '⌘', 'V' ] }
				]
			})
			container.appendChild(menu)
			await new Promise(requestAnimationFrame)
			if (!menu.open({ at: { x: 160, y: 96 }, autoFocus: true })) {
				throw new Error('Expected context menu to open.')
			}
		})

		const option = page.locator('.goo-context-menu-popout .goo-select__option[data-id="copy"]')
		await expect(option).toHaveClass(/goo-select__option--hovered/)

		const beforeHover = await readMenuRowColors(option)
		expect(beforeHover.shortcutColor).toBe(beforeHover.rowColor)

		await option.hover()

		const afterHover = await readMenuRowColors(option)
		expect(afterHover.shortcutColor).toBe(afterHover.rowColor)
		expect(afterHover.shortcutColor).toBe(beforeHover.shortcutColor)
	})
})

async function readMenuRowColors(
	option: Locator
): Promise<{ rowColor: string; shortcutColor: string }> {
	return await option.evaluate(element => {
		const key = element.querySelector<HTMLElement>('.goo-select__shortcut-key')
		if (!key) throw new Error('Expected highlighted option to render shortcut keys.')
		return {
			rowColor: getComputedStyle(element).color,
			shortcutColor: getComputedStyle(key).color
		}
	})
}

interface GooHarnessWindow extends Window {
	goo: {
		createGooContextMenu(options: {
			options: Array<{
				id: string
				label: string
				shortcut: string[]
			}>
		}): HTMLElement & {
			open(options: { at: { x: number; y: number }; autoFocus?: boolean }): boolean
		}
	}
}
