import { describe, expect, it } from 'vitest'

import { createGooDialogContent } from '../dialogContent.ts'

describe('createGooDialogContent', () => {
	it('keeps simple translated markup while removing executable attributes', () => {
		const content = createGooDialogContent(
			'<p class="notice" onclick="alert(1)">Line 1<br><a href="https://example.com" target="_blank">More</a></p>'
		)
		const host = document.createElement('div')
		host.append(content)

		expect(host.querySelector('p.notice')).not.toBeNull()
		expect(host.querySelector('br')).not.toBeNull()
		expect(host.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
		expect(host.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer')
		expect(host.querySelector('[onclick]')).toBeNull()
	})

	it('drops unsupported elements without interpreting them', () => {
		const content = createGooDialogContent('Safe <img src=x onerror=alert(1)> text')
		const host = document.createElement('div')
		host.append(content)

		expect(host.querySelector('img')).toBeNull()
		expect(host.textContent).toBe('Safe  text')
	})
})
