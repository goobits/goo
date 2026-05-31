import { describe, expect, it } from 'vitest'

import { createGooDialogTextContent, createTrustedGooDialogContent } from '../dialogContent.ts'

describe('createGooDialogTextContent', () => {
	it('preserves translated line break markers without parsing other markup', () => {
		const content = createGooDialogTextContent('One<br>Two\n<b>Three</b>')
		const host = document.createElement('div')
		host.append(content)

		expect(host.querySelectorAll('br')).toHaveLength(2)
		expect(host.querySelector('b')).toBeNull()
		expect(host.textContent).toBe('OneTwo<b>Three</b>')
	})
})

describe('createTrustedGooDialogContent', () => {
	it('keeps simple translated markup while removing executable attributes', () => {
		const content = createTrustedGooDialogContent(
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
		const content = createTrustedGooDialogContent('Safe <img src=x onerror=alert(1)> text')
		const host = document.createElement('div')
		host.append(content)

		expect(host.querySelector('img')).toBeNull()
		expect(host.textContent).toBe('Safe  text')
	})
})
