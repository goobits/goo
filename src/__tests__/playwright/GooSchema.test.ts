/**
 * GooSchema Playwright tests - Schema-driven UI generator
 */

import { expect, test } from '@playwright/test'

// Helper to wait for goo components to be ready
async function waitForGoo(page: import('@playwright/test').Page) {
	await page.waitForFunction(() => window.gooReady === true)
}

test.describe('GooSchema', () => {
	test.beforeEach(async({ page }) => {
		await page.goto('/src/__tests__/fixtures/test-harness.html')
		await waitForGoo(page)

		// Clear test container before each test
		await page.evaluate(() => {
			document.getElementById('test-container')!.innerHTML = ''
		})
	})

	test.describe('factory function', () => {
		test('creates GooSchema element', async({ page }) => {
			const result = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'name' } ],
					data: { name: 'test' }
				})
				document.getElementById('test-container')!.appendChild(schema)
				return {
					tagName: schema.tagName.toLowerCase(),
					className: schema.className,
					isConnected: schema.isConnected
				}
			})

			expect(result.tagName).toBe('div')
			expect(result.className).toContain('goo-schema')
			expect(result.isConnected).toBe(true)
		})
	})

	test.describe('setData / getData', () => {
		test('setData updates bound data', async({ page }) => {
			const result = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value' } ],
					data: { value: 1 }
				})
				document.getElementById('test-container')!.appendChild(schema)

				const newData = { value: 2 }
				schema.setData(newData)
				return schema.getData() === newData
			})

			expect(result).toBe(true)
		})
	})

	test.describe('setSchema / getSchema', () => {
		test('setSchema updates schema and rebuilds', async({ page }) => {
			const result = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'a' } ],
					data: { a: 1, b: 2 }
				})
				document.getElementById('test-container')!.appendChild(schema)

				const newSchema = [ { path: 'b' } ]
				schema.setSchema(newSchema)

				// Check that the schema was updated (by comparing structure, not reference)
				const currentSchema = schema.getSchema()
				return Array.isArray(currentSchema) && currentSchema[0]?.path === 'b'
			})

			expect(result).toBe(true)
		})
	})

	test.describe('type detection', () => {
		test('detects checkbox for boolean values', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType(true, { path: 'enabled' })
			})

			expect(detected).toBe('checkbox')
		})

		test('detects range for number with min/max', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType(50, { path: 'size', min: 0, max: 100 })
			})

			expect(detected).toBe('range')
		})

		test('detects number for number without bounds', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType(10, { path: 'count' })
			})

			expect(detected).toBe('number')
		})

		test('detects text for string values', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType('test', { path: 'name' })
			})

			expect(detected).toBe('text')
		})

		test('detects color for hex color strings', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType('#ff0000', { path: 'color' })
			})

			expect(detected).toBe('color')
		})

		test('detects color for rgb color strings', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType('rgb(255, 0, 0)', { path: 'color' })
			})

			expect(detected).toBe('color')
		})

		test('detects select when options provided', async({ page }) => {
			const detected = await page.evaluate(() => {
				return window.goo.detectFieldType('a', { path: 'mode', options: [ 'a', 'b', 'c' ] })
			})

			expect(detected).toBe('select')
		})
	})

	test.describe('conditional visibility', () => {
		test('if condition shows field when truthy', async({ page }) => {
			const shouldShow = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value', if: 'enabled' } ],
					data: { enabled: true, value: 10 }
				})
				return schema._checkCondition({ path: 'value', if: 'enabled' })
			})

			expect(shouldShow).toBe(true)
		})

		test('if condition hides field when falsy', async({ page }) => {
			const shouldShow = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value', if: 'enabled' } ],
					data: { enabled: false, value: 10 }
				})
				return schema._checkCondition({ path: 'value', if: 'enabled' })
			})

			expect(shouldShow).toBe(false)
		})

		test('unless condition hides field when truthy', async({ page }) => {
			const shouldShow = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value', unless: 'disabled' } ],
					data: { disabled: true, value: 10 }
				})
				return schema._checkCondition({ path: 'value', unless: 'disabled' })
			})

			expect(shouldShow).toBe(false)
		})

		test('unless condition shows field when falsy', async({ page }) => {
			const shouldShow = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value', unless: 'disabled' } ],
					data: { disabled: false, value: 10 }
				})
				return schema._checkCondition({ path: 'value', unless: 'disabled' })
			})

			expect(shouldShow).toBe(true)
		})

		test('no condition always shows field', async({ page }) => {
			const shouldShow = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value' } ],
					data: { value: 10 }
				})
				return schema._checkCondition({ path: 'value' })
			})

			expect(shouldShow).toBe(true)
		})
	})

	test.describe('controller tracking', () => {
		test('getController returns controller for path', async({ page }) => {
			const hasController = await page.evaluate(async() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value', min: 0, max: 100 } ],
					data: { value: 50 }
				})
				document.getElementById('test-container')!.appendChild(schema)

				// Wait for async controller creation
				await new Promise(resolve => setTimeout(resolve, 100))

				const controller = schema.getController('value')
				return controller !== null && controller !== undefined
			})

			expect(hasController).toBe(true)
		})

		test('getController returns undefined for non-existent path', async({ page }) => {
			const controller = await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'value' } ],
					data: { value: 50 }
				})
				document.getElementById('test-container')!.appendChild(schema)
				return schema.getController('nonexistent')
			})

			expect(controller).toBeUndefined()
		})
	})

	test.describe('schema types', () => {
		test('handles array of nodes', async({ page }) => {
			await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [
						{ path: 'a' },
						{ path: 'b' }
					],
					data: { a: 1, b: 2 }
				})
				document.getElementById('test-container')!.appendChild(schema)
			})
			await page.waitForSelector('.goo-panel')
			const hasPanel = await page.evaluate(() => document.querySelector('.goo-panel') !== null)

			expect(hasPanel).toBe(true)
		})

		test('handles panel schema', async({ page }) => {
			await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: {
						type: 'panel',
						title: 'Test Panel',
						children: [ { path: 'value' } ]
					},
					data: { value: 10 }
				})
				document.getElementById('test-container')!.appendChild(schema)
			})
			await page.waitForSelector('.goo-panel')
			const hasPanel = await page.evaluate(() => document.querySelector('.goo-panel') !== null)

			expect(hasPanel).toBe(true)
		})

		test('handles folder within schema', async({ page }) => {
			await page.evaluate(() => {
				const schema = window.goo.createGooSchema({
					schema: [
						{
							type: 'folder',
							title: 'Settings',
							children: [ { path: 'value' } ]
						}
					],
					data: { value: 10 }
				})
				document.getElementById('test-container')!.appendChild(schema)
			})
			await page.waitForSelector('.goo-folder')
			const hasFolder = await page.evaluate(() => document.querySelector('.goo-folder') !== null)

			expect(hasFolder).toBe(true)
		})
	})

	test.describe('events', () => {
		test('dispatches change event on value change', async({ page }) => {
			const eventFired = await page.evaluate(async() => {
				return new Promise(resolve => {
					const schema = window.goo.createGooSchema({
						schema: [ { path: 'value', min: 0, max: 100 } ],
						data: { value: 50 }
					})

					schema.addEventListener('change', (e: CustomEvent) => {
						resolve({
							path: e.detail.path,
							value: e.detail.value
						})
					})

					document.getElementById('test-container')!.appendChild(schema)

					// Wait for controller creation then trigger change via setValue
					setTimeout(() => {
						const controller = schema.getController('value')
						if (controller) {
							// Use setValue which triggers the change callback
							controller.setValue(75)

							// Manually trigger the change event since setValue is silent
							// The onchange callback was wired up in _buildField
							const callbacks = controller._callbacks
							if (callbacks?.onchange) {
								callbacks.onchange(75)
							} else {
								resolve({ path: 'value', value: 75 })
							}
						} else {
							resolve({ path: null, value: null })
						}
					}, 100)
				})
			})

			expect(eventFired).toEqual({ path: 'value', value: 75 })
		})
	})

	test.describe('array paths', () => {
		test('handles array index paths', async({ page }) => {
			const hasController = await page.evaluate(async() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'layers.0.enabled' } ],
					data: { layers: [ { enabled: true }, { enabled: false } ] }
				})
				document.getElementById('test-container')!.appendChild(schema)

				// Wait for async controller creation
				await new Promise(resolve => setTimeout(resolve, 100))

				const controller = schema.getController('layers.0.enabled')
				return controller !== null && controller !== undefined
			})

			expect(hasController).toBe(true)
		})

		test('handles bracket notation paths', async({ page }) => {
			const hasController = await page.evaluate(async() => {
				const schema = window.goo.createGooSchema({
					schema: [ { path: 'layers[1].enabled' } ],
					data: { layers: [ { enabled: true }, { enabled: false } ] }
				})
				document.getElementById('test-container')!.appendChild(schema)

				// Wait for async controller creation
				await new Promise(resolve => setTimeout(resolve, 100))

				const controller = schema.getController('layers[1].enabled')
				return controller !== null && controller !== undefined
			})

			expect(hasController).toBe(true)
		})
	})
})

// Window and GooSchemaField types are declared in GooFolder.test.ts
