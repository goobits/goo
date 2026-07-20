import { render } from '@testing-library/svelte'
import { createRawSnippet, tick } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import GooTooltip from '../GooTooltip.svelte'
import type { GooTooltipInstance } from '../index.ts'

const richChildren = createRawSnippet(() => ({
	render: () => '<strong data-testid="rich-tooltip-content">Save</strong>'
}))

describe('GooTooltip children', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('reveals rich Svelte children when the tooltip opens', async() => {
		const button = document.createElement('button')
		button.id = 'rich-tooltip-target'
		document.body.append(button)
		let instance: GooTooltipInstance | null = null

		render(GooTooltip, {
			props: {
				for: button.id,
				trigger: 'manual',
				children: richChildren,
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
		const content = document.querySelector('[data-testid="rich-tooltip-content"]')

		expect(content).not.toBeNull()
		expect(content?.closest('[hidden]')).toBeNull()

		instance?.destroy()
	})
})
