import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import GooTooltip from '../GooTooltip.svelte'
import type { GooTooltipInstance } from '../index.ts'
import { createGooTooltip, tooltip } from '../index.ts'

describe('GooTooltip', () => {
	afterEach(() => {
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		document.querySelectorAll('[aria-describedby]').forEach(element => element.removeAttribute('aria-describedby'))
	})

	it('creates tooltips without registering a tooltip custom element', () => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const instance = createGooTooltip({ for: button, content: 'Save', trigger: 'manual' })

		instance.show()

		expect(document.querySelector('goo-tooltip')).toBeNull()
		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()
		expect(instance.visible).toBe(true)

		instance.destroy()
		button.remove()
	})

	it('binds the Svelte component instance for imperative control', async() => {
		const button = document.createElement('button')
		button.id = 'tooltip-target'
		document.body.appendChild(button)
		let instance: GooTooltipInstance | null = null

		render(GooTooltip, {
			props: {
				for: 'tooltip-target',
				content: 'Save',
				trigger: 'manual',
				get instance() {
					return instance
				},
				set instance(value) {
					instance = value
				}
			}
		})
		await tick()

		instance?.show()

		expect(instance?.visible).toBe(true)
		expect(button.getAttribute('aria-describedby')).toMatch(/^goo-tooltip-/)

		instance?.destroy()
		button.remove()
	})

	it('attaches tooltip behavior as a Svelte action', async() => {
		const button = document.createElement('button')
		document.body.appendChild(button)
		const lifecycle = tooltip(button, { content: 'Save', showDelay: 0 })

		button.dispatchEvent(new MouseEvent('mouseenter'))
		await new Promise(resolve => setTimeout(resolve))

		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()

		lifecycle.destroy()
		button.remove()
	})
})
