import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import GooSpinner from '../GooSpinner.svelte'
import { renderGooSpinnerHtml } from '../index.js'

describe('GooSpinner', () => {
	it('renders accessible spinner markup for raw HTML callers', () => {
		const container = document.createElement('div')
		container.innerHTML = renderGooSpinnerHtml({
			class: 'asset-loader',
			label: 'Loading assets',
			size: 'lg',
			thickness: 3,
			variant: 'rainbow'
		})

		const spinner = container.querySelector('.goo-spinner')

		expect(spinner?.tagName).toBe('DIV')
		expect(spinner?.classList.contains('asset-loader')).toBe(true)
		expect(spinner?.getAttribute('role')).toBe('status')
		expect(spinner?.getAttribute('aria-label')).toBe('Loading assets')
		expect(spinner?.getAttribute('size')).toBe('lg')
		expect(spinner?.getAttribute('variant')).toBe('rainbow')
		expect(spinner?.getAttribute('style')).toContain('--goo-spinner-stroke: 3px')
	})

	it('maps a custom-length thickness to the spinner stroke variable', () => {
		const container = document.createElement('div')
		container.innerHTML = renderGooSpinnerHtml({ thickness: '0.25rem' })
		expect(container.querySelector('.goo-spinner')?.getAttribute('style')).toContain('--goo-spinner-stroke: 0.25rem')

		container.innerHTML = renderGooSpinnerHtml({ thickness: 'bad' })
		expect(container.querySelector('.goo-spinner')?.getAttribute('style') ?? '').not.toContain('--goo-spinner-stroke')
	})

	it('escapes attributes in raw HTML markup', () => {
		const container = document.createElement('div')
		container.innerHTML = renderGooSpinnerHtml({
			label: 'Load "safe" <assets>'
		})

		expect(container.querySelector('.goo-spinner')?.getAttribute('aria-label'))
			.toBe('Load "safe" <assets>')
	})

	it('renders the Svelte component with size and variant', () => {
		const { container } = render(GooSpinner, { props: { size: 'lg', variant: 'rainbow', label: 'Loading' } })
		const spinner = container.querySelector('.goo-spinner')
		expect(spinner?.getAttribute('role')).toBe('status')
		expect(spinner?.getAttribute('size')).toBe('lg')
		expect(spinner?.getAttribute('variant')).toBe('rainbow')
	})
})
