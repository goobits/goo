// @vitest-environment node

import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import GooSelect from '../GooSelect.svelte'

describe('GooSelect SSR', () => {
	it('renders without browser Element globals', () => {
		const result = render(GooSelect, {
			props: {
				ariaLabel: 'Theme',
				options: [
					{ id: 'light', label: 'Light' },
					{ id: 'dark', label: 'Dark' }
				],
				value: 'dark'
			}
		})

		expect(result.body).toContain('Dark')
		expect(result.body).toContain('aria-label="Theme"')
	})
})
