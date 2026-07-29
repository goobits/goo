// @vitest-environment node

import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import GooSelect from '../GooSelect.svelte'

describe('GooSelect SSR', () => {
	it('renders selected string options without browser DOM globals', () => {
		const { body } = render(GooSelect, {
			props: {
				ariaLabel: 'Theme',
				options: [
					{ id: 'light', label: 'Light' },
					{ id: 'dark', label: 'Dark' }
				],
				value: 'dark'
			}
		})

		expect(body).toContain('role="combobox"')
		expect(body).toContain('aria-label="Theme"')
		expect(body).toContain('Dark')
		expect(body).not.toContain('Select...</span>')
	})
})
