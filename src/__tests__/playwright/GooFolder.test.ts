/**
 * GooFolder Playwright tests - Focus on nested folder click/toggle behavior
 */

import { expect, test } from '@playwright/test'

// Helper to wait for goo components to be ready
async function waitForGoo(page: import('@playwright/test').Page) {
	await page.waitForFunction(() => window.gooReady === true)
}

// Helper to create a folder in the page
async function _createFolder(page: import('@playwright/test').Page, title: string) {
	return page.evaluate(t => {
		const folder = window.goo.createFolder({ title: t })
		document.getElementById('test-container')!.appendChild(folder)
		return folder
	}, title)
}

test.describe('GooFolder', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)

		// Clear test container before each test
		await page.evaluate(() => {
			document.getElementById('test-container')!.innerHTML = ''
		})
	})

	test.describe('basic functionality', () => {
		test('creates folder with title', async({ page }) => {
			const title = await page.evaluate(() => {
				const folder = window.goo.createFolder({ title: 'Test Folder' })
				document.getElementById('test-container')!.appendChild(folder)
				return {
					title: folder.title,
					titleText: folder.$title.textContent
				}
			})

			expect(title.title).toBe('Test Folder')
			expect(title.titleText).toBe('Test Folder')
		})

		test('folder is open by default', async({ page }) => {
			const state = await page.evaluate(() => {
				const folder = window.goo.createFolder({ title: 'Test' })
				document.getElementById('test-container')!.appendChild(folder)
				return {
					open: folder.open,
					hasOpenClass: folder.classList.contains('goo-folder--open')
				}
			})

			expect(state.open).toBe(true)
			expect(state.hasOpenClass).toBe(true)
		})

		test('toggle() changes open state', async({ page }) => {
			const states = await page.evaluate(() => {
				const folder = window.goo.createFolder({ title: 'Test' })
				document.getElementById('test-container')!.appendChild(folder)

				const initial = folder.open
				folder.toggle()
				const afterFirst = folder.open
				folder.toggle()
				const afterSecond = folder.open

				return { initial, afterFirst, afterSecond }
			})

			expect(states.initial).toBe(true)
			expect(states.afterFirst).toBe(false)
			expect(states.afterSecond).toBe(true)
		})

		test('clicking header toggles folder', async({ page }) => {
			await page.evaluate(() => {
				const folder = window.goo.createFolder({ title: 'Test' })
				document.getElementById('test-container')!.appendChild(folder)
			})

			// Verify initially open
			const initialState = await page.evaluate(() => {
				const folder = document.querySelector('.goo-folder') as GooFolderElement | null
				return folder?.open
			})
			expect(initialState).toBe(true)

			// Click the header
			await page.click('.goo-folder .goo-folder__header')

			// Verify closed
			const afterClick = await page.evaluate(() => {
				const folder = document.querySelector('.goo-folder') as GooFolderElement | null
				return {
					open: folder?.open,
					hasOpenClass: folder?.classList.contains('goo-folder--open')
				}
			})
			expect(afterClick.open).toBe(false)
			expect(afterClick.hasOpenClass).toBe(false)
		})
	})

	test.describe('nested folders', () => {
		test('addFolder() creates and adds nested folder', async({ page }) => {
			const result = await page.evaluate(() => {
				const parent = window.goo.createFolder({ title: 'Parent' })
				document.getElementById('test-container')!.appendChild(parent)

				const child = parent.addFolder('Child')

				return {
					childTitle: child.title,
					childInContent: parent.$content.contains(child),
					childInFolders: parent.folders.includes(child)
				}
			})

			expect(result.childTitle).toBe('Child')
			expect(result.childInContent).toBe(true)
			expect(result.childInFolders).toBe(true)
		})

		test('nested folder has $content after being added', async({ page }) => {
			const result = await page.evaluate(() => {
				const parent = window.goo.createFolder({ title: 'Parent' })
				document.getElementById('test-container')!.appendChild(parent)

				const child = parent.addFolder('Child')

				return {
					hasContent: child.$content !== null,
					hasHeader: child.$header !== null
				}
			})

			expect(result.hasContent).toBe(true)
			expect(result.hasHeader).toBe(true)
		})

		test('nested folder header is clickable', async({ page }) => {
			await page.evaluate(() => {
				const parent = window.goo.createFolder({ title: 'Parent' })
				document.getElementById('test-container')!.appendChild(parent)
				parent.addFolder('Child')
			})

			// Verify child initially open
			const initialState = await page.evaluate(() => {
				const child = document.querySelectorAll('.goo-folder')[1] as GooFolderElement | undefined
				return child?.open
			})
			expect(initialState).toBe(true)

			// Click child header (second folder's header)
			await page.click('.goo-folder .goo-folder .goo-folder__header')

			// Verify child closed
			const afterClick = await page.evaluate(() => {
				const child = document.querySelectorAll('.goo-folder')[1] as GooFolderElement | undefined
				return {
					open: child?.open,
					hasOpenClass: child?.classList.contains('goo-folder--open')
				}
			})
			expect(afterClick.open).toBe(false)
			expect(afterClick.hasOpenClass).toBe(false)
		})

		test('clicking nested folder does NOT toggle parent', async({ page }) => {
			await page.evaluate(() => {
				const parent = window.goo.createFolder({ title: 'Parent' })
				document.getElementById('test-container')!.appendChild(parent)
				parent.addFolder('Child')
			})

			// Click child header
			await page.click('.goo-folder .goo-folder .goo-folder__header')

			// Verify parent still open, child closed
			const states = await page.evaluate(() => {
				const folders = document.querySelectorAll('.goo-folder') as NodeListOf<GooFolderElement>
				return {
					parentOpen: folders[0]?.open,
					childOpen: folders[1]?.open
				}
			})
			expect(states.parentOpen).toBe(true)
			expect(states.childOpen).toBe(false)
		})

		test('deeply nested folders are all clickable', async({ page }) => {
			await page.evaluate(() => {
				const level1 = window.goo.createFolder({ title: 'Level 1' })
				document.getElementById('test-container')!.appendChild(level1)

				const level2 = level1.addFolder('Level 2')
				level2.addFolder('Level 3')
			})

			// Verify all start open
			const initialStates = await page.evaluate(() => {
				const folders = document.querySelectorAll('.goo-folder') as NodeListOf<GooFolderElement>
				return [ folders[0]?.open, folders[1]?.open, folders[2]?.open ]
			})
			expect(initialStates).toEqual([ true, true, true ])

			// Click level 3
			await page.click('.goo-folder .goo-folder .goo-folder .goo-folder__header')
			const afterLevel3 = await page.evaluate(() => {
				const folders = document.querySelectorAll('.goo-folder') as NodeListOf<GooFolderElement>
				return [ folders[0]?.open, folders[1]?.open, folders[2]?.open ]
			})
			expect(afterLevel3).toEqual([ true, true, false ])

			// Click level 2
			await page.click('.goo-folder > .goo-folder__content > .goo-folder > .goo-folder__header')
			const afterLevel2 = await page.evaluate(() => {
				const folders = document.querySelectorAll('.goo-folder') as NodeListOf<GooFolderElement>
				return [ folders[0]?.open, folders[1]?.open, folders[2]?.open ]
			})
			expect(afterLevel2).toEqual([ true, false, false ])

			// Click level 1
			await page.click('#test-container > .goo-folder > .goo-folder__header')
			const afterLevel1 = await page.evaluate(() => {
				const folders = document.querySelectorAll('.goo-folder') as NodeListOf<GooFolderElement>
				return [ folders[0]?.open, folders[1]?.open, folders[2]?.open ]
			})
			expect(afterLevel1).toEqual([ false, false, false ])
		})

		test('add() method works for nested folders', async({ page }) => {
			await page.evaluate(() => {
				const parent = window.goo.createFolder({ title: 'Parent' })
				document.getElementById('test-container')!.appendChild(parent)

				const child = window.goo.createFolder({ title: 'Child' })
				parent.add(child)
			})

			// Verify child in parent
			const inParent = await page.evaluate(() => {
				const parent = document.querySelector('.goo-folder') as GooFolderElement | null
				const child = document.querySelectorAll('.goo-folder')[1] as GooFolderElement | undefined
				return parent?.$content.contains(child!)
			})
			expect(inParent).toBe(true)

			// Click child header
			await page.click('.goo-folder .goo-folder .goo-folder__header')

			// Verify clickable
			const childOpen = await page.evaluate(() => {
				const child = document.querySelectorAll('.goo-folder')[1] as GooFolderElement | undefined
				return child?.open
			})
			expect(childOpen).toBe(false)
		})
	})

	test.describe('event propagation', () => {
		test('nested folder click does not bubble to parent handler', async({ page }) => {
			const clicks = await page.evaluate(() => {
				const parent = window.goo.createFolder({ title: 'Parent' })
				document.getElementById('test-container')!.appendChild(parent)

				const child = parent.addFolder('Child')

				let parentClicks = 0
				let childClicks = 0

				parent.$header.addEventListener('click', () => parentClicks++)
				child.$header.addEventListener('click', () => childClicks++)

				// Click child
				child.$header.click()

				return { parentClicks, childClicks }
			})

			expect(clicks.childClicks).toBe(1)
			expect(clicks.parentClicks).toBe(0)
		})
	})
})

// Extend Window interface for TypeScript
declare global {
	interface GooSchemaField {
		path?: string
		type?: string
		title?: string
		children?: GooSchemaField[]
		min?: number
		max?: number
		if?: string
		unless?: string
	}

	interface GooControllerElement extends HTMLElement {
		setValue(value: unknown): void
		_callbacks?: { onchange?: (value: unknown) => void }
	}

	interface Window {
		gooReady: boolean
		goo: {
			createPanel: (options?: Record<string, unknown>) => HTMLElement
			createFolder: (options?: { title?: string; open?: boolean }) => GooFolderElement
			createCheckbox: (options?: Record<string, unknown>) => HTMLElement
			createGooController: (options?: Record<string, unknown>) => HTMLElement
			createGooSchema: (options?: { schema?: GooSchemaField[] | GooSchemaField; data?: Record<string, unknown> }) => HTMLElement & {
				setData(data: Record<string, unknown>): void
				getData(): Record<string, unknown>
				setSchema(schema: GooSchemaField[] | GooSchemaField): void
				getSchema(): GooSchemaField[] | GooSchemaField
				getController(path: string): GooControllerElement | undefined
				_checkCondition(field: { path?: string; if?: string; unless?: string }): boolean
			}
			detectFieldType: (value: unknown, field: { path: string; min?: number; max?: number; options?: string[] }) => string
		}
	}

	interface GooFolderElement extends HTMLElement {
		open: boolean
		title: string
		$header: HTMLElement
		$content: HTMLElement
		$title: HTMLElement
		folders: GooFolderElement[]
		toggle(): void
		addFolder(title: string): GooFolderElement
		add(element: HTMLElement): void
	}
}
