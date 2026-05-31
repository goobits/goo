import { render } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'

import GooIcon from '../GooIcon.svelte'
import {
	renderIconHtml,
	renderIconPlaceholderHtml,
	renderIconPlaceholders
} from '../index.js'
import { iconRegistry } from '../registry.js'

describe('GooIcon', () => {
	afterEach(() => {
		iconRegistry.clear()
	})

	it('renders a registered icon at the requested size', () => {
		iconRegistry.register('check', '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>')

		const { container } = render(GooIcon, {
			props: {
				value: 'check',
				size: 24
			}
		})

		const icon = container.querySelector('.goo-icon')
		const svg = container.querySelector('svg')

		expect((icon as HTMLElement | null)?.style.width).toBe('24px')
		expect((icon as HTMLElement | null)?.style.height).toBe('24px')
		expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
	})

	it('marks stroke-only icons for CSS fill handling', () => {
		iconRegistry.register('plus', '<svg fill="none" viewBox="0 0 24 24"><path d="M12 5v14"/></svg>')

		const { container } = render(GooIcon, {
			props: {
				value: 'plus'
			}
		})

		expect(container.querySelector('.goo-icon')?.hasAttribute('data-stroke')).toBe(true)
	})

	it('renders meaningful icons with img semantics', () => {
		iconRegistry.register('settings', '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8"/></svg>')

		const { container } = render(GooIcon, {
			props: {
				value: 'settings',
				label: 'Settings'
			}
		})

		const icon = container.querySelector('.goo-icon')

		expect(icon?.getAttribute('role')).toBe('img')
		expect(icon?.getAttribute('aria-label')).toBe('Settings')
		expect(icon?.hasAttribute('aria-hidden')).toBe(false)
	})

	it('renders inert placeholders for raw HTML callers', () => {
		const html = renderIconPlaceholderHtml({ value: 'save', size: 24 })
		const container = document.createElement('div')
		container.innerHTML = html

		const icon = container.querySelector('.goo-icon')

		expect(container.querySelector('goo-icon')).toBeNull()
		expect(icon?.getAttribute('data-goo-icon')).toBe('save')
		expect(icon?.getAttribute('data-value')).toBe('save')
		expect(icon?.getAttribute('data-size')).toBe('24px')
		expect((icon as HTMLElement | null)?.style.width).toBe('24px')
	})

	it('hydrates raw HTML placeholders from the icon registry', () => {
		iconRegistry.register('save', '<svg fill="none" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>')
		const container = document.createElement('div')
		container.innerHTML = renderIconPlaceholderHtml({ value: 'save', size: '20px' })

		renderIconPlaceholders(container)

		const icon = container.querySelector('.goo-icon')

		expect(icon?.getAttribute('data-goo-icon')).toBeNull()
		expect(icon?.getAttribute('data-value')).toBe('save')
		expect(icon?.hasAttribute('data-stroke')).toBe(true)
		expect(icon?.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24')
		expect((icon as HTMLElement | null)?.style.height).toBe('20px')
	})

	it('renders full raw HTML icons without placeholder hydration markers', () => {
		iconRegistry.register('download', '<svg viewBox="0 0 24 24"><path d="M12 3v12"/></svg>')

		const container = document.createElement('div')
		container.innerHTML = renderIconHtml({ value: 'download', label: 'Download' })

		const icon = container.querySelector('.goo-icon')

		expect(icon?.getAttribute('data-goo-icon')).toBeNull()
		expect(icon?.getAttribute('data-value')).toBe('download')
		expect(icon?.getAttribute('role')).toBe('img')
		expect(icon?.querySelector('svg')).not.toBeNull()
	})
})
