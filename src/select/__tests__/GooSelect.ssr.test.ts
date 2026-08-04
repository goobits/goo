// @vitest-environment node

import { readFileSync } from 'node:fs'

import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import GooSelect from '../GooSelect.svelte'

const selectSource = readFileSync('src/select/GooSelect.svelte', 'utf8')
const selectStyles = readFileSync('src/select/GooSelect.css', 'utf8')

describe('GooSelect SSR', () => {
	it('keeps the hidden native field stable before deferred visual CSS arrives', () => {
		const scripts = [ ...selectSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g) ]
			.map(match => match[1])
			.join('\n')

		expect(scripts).toContain("import './GooSelect.css'")
		expect(scripts).toContain("import './GooSelect.submenu.css'")
		expect(selectSource).toMatch(/<select[\s\S]*?class="goo-select__field"[\s\S]*?style="[^"]*position: absolute;/)
		expect(selectSource).toMatch(/<select[\s\S]*?style="[^"]*clip-path: inset\(50%\);/)
		expect(selectStyles).not.toMatch(/\.goo-select__field\s*{/)
	})

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
