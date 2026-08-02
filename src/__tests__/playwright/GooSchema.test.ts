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

	test('ellipsizes button-group labels when their segment is too narrow', async({ page }) => {
		await page.evaluate(() => {
			const host = document.createElement('div')
			host.style.width = '180px'
			const schema = (window as unknown as GooHarnessWindow).goo.createGooSchema({
				schema: [ {
					ariaLabel: 'Spiral type',
					path: 'variant',
					showLabel: false,
					type: 'button-group',
					options: [
						{ id: 'archimedean', icon: 'test-icon', label: 'Archimedean' },
						{ id: 'logarithmic', icon: 'test-icon', label: 'Logarithmic' },
						{ id: 'rosette', icon: 'test-icon', label: 'Rosette' }
					]
				} ],
				data: { variant: 'archimedean' },
				bare: true
			})
			host.appendChild(schema)
			document.getElementById('test-container')!.appendChild(host)
		})

		const title = page.locator('.goo-button[data-id="archimedean"] .goo-button__title')
		await expect(title).toBeVisible()
		const state = await title.evaluate(element => {
			const style = getComputedStyle(element)
			return {
				clipped: element.scrollWidth > element.clientWidth,
				display: style.display,
				overflow: style.overflow,
				textOverflow: style.textOverflow,
				whiteSpace: style.whiteSpace
			}
		})

		expect(state).toEqual({
			clipped: true,
			display: 'block',
			overflow: 'hidden',
			textOverflow: 'ellipsis',
			whiteSpace: 'nowrap'
		})

		const button = page.locator('.goo-button[data-id="archimedean"]')
		await expect(button).not.toHaveAttribute('title')
		const icon = button.locator('.goo-button__icon')
		await icon.evaluate(element => {
			element.setAttribute('style', 'width: 12px; height: 12px')
		})
		await icon.hover()
		await expect(page.getByRole('tooltip')).toHaveText('Archimedean')
		await expect(button).toHaveAttribute('aria-describedby', /^goo-tooltip-/)
	})

	test('uses matching rounded surfaces for button-group hover and selection', async({ page }) => {
		await page.evaluate(() => {
			const schema = (window as unknown as GooHarnessWindow).goo.createGooSchema({
				schema: [ {
					ariaLabel: 'Alignment',
					path: 'alignment',
					showLabel: false,
					type: 'button-group',
					options: [ 'Left', 'Center', 'Right' ]
				} ],
				data: { alignment: 'Left' },
				bare: true
			})
			document.getElementById('test-container')!.appendChild(schema)
		})

		const group = page.locator('.goo-button-group')
		const selectedButton = group.locator('.goo-button[data-id="Left"]')
		const hoverButton = group.locator('.goo-button[data-id="Center"]')
		await group.evaluate(element => {
			const style = (element as HTMLElement).style
			style.setProperty('--goo-button-group-indicator-inset-block', '2px')
			style.setProperty('--goo-button-group-indicator-radius', '5px')
			style.setProperty('--goo-button-group-motion-fast', '0s')
			style.setProperty('--goo-button-group-selected-bg', 'rgb(20, 80, 200)')
			style.setProperty('--goo-button-group-selected-bg-hover', 'rgb(30, 90, 210)')
			style.setProperty('--goo-theme-border', 'rgb(50, 60, 70)')
		})
		await expect(selectedButton).toHaveClass(/goo-button--selected/)

		const selectedSurface = await group.evaluate(element => {
			const style = getComputedStyle(element, '::before')
			return {
				background: style.backgroundColor,
				borderRadius: style.borderRadius,
				bottom: style.bottom,
				opacity: style.opacity,
				top: style.top
			}
		})
		const idleHoverSurface = await hoverButton.evaluate(element => {
			const buttonStyle = getComputedStyle(element)
			const surfaceStyle = getComputedStyle(element, '::before')
			return {
				background: surfaceStyle.backgroundColor,
				borderRadius: surfaceStyle.borderRadius,
				bottom: surfaceStyle.bottom,
				buttonBackground: buttonStyle.backgroundColor,
				opacity: surfaceStyle.opacity,
				top: surfaceStyle.top
			}
		})

		expect(idleHoverSurface).toEqual({
			background: expect.not.stringMatching(/rgba?\(0, 0, 0, 0\)/),
			borderRadius: selectedSurface.borderRadius,
			bottom: selectedSurface.bottom,
			buttonBackground: 'rgba(0, 0, 0, 0)',
			opacity: '0',
			top: selectedSurface.top
		})

		await hoverButton.hover()
		await expect.poll(async() => hoverButton.evaluate(element => {
			return getComputedStyle(element, '::before').opacity
		})).toBe('1')

		const hoveredSurface = await hoverButton.evaluate(element => {
			const buttonStyle = getComputedStyle(element)
			const surfaceStyle = getComputedStyle(element, '::before')
			return {
				borderRadius: surfaceStyle.borderRadius,
				bottom: surfaceStyle.bottom,
				buttonBackground: buttonStyle.backgroundColor,
				top: surfaceStyle.top
			}
		})
		expect(hoveredSurface).toEqual({
			borderRadius: selectedSurface.borderRadius,
			bottom: selectedSurface.bottom,
			buttonBackground: 'rgba(0, 0, 0, 0)',
			top: selectedSurface.top
		})

		await selectedButton.hover()
		await expect.poll(async() => group.evaluate(element => {
			return getComputedStyle(element, '::before').backgroundColor
		})).not.toBe(selectedSurface.background)
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
	ariaLabel?: string
	children?: GooSchemaField[]
	path?: string
	open?: boolean
	min?: number
	max?: number
	options?: Array<{
		icon?: string
		label: string
		value: string
	}>
	showLabel?: boolean
	title?: string
	type?: string
}

interface GooSchemaElement extends HTMLElement {
	setData(data: Record<string, unknown>): void
	getData(): Record<string, unknown>
	getController(path: string): HTMLElement | undefined
}
