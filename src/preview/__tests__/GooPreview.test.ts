import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import GooPreview from '../GooPreview.svelte'

describe('GooPreview', () => {
	it('renders themed image previews with badge text', () => {
		const { container, getByRole, getByText } = render(GooPreview, {
			props: {
				alt: 'Brush preset',
				badge: '42 px',
				hue: '#ba8cff',
				src: 'data:image/png;base64,preview'
			}
		})

		const imageByRole = getByRole('img', { name: 'Brush preset' })
		const root = container.querySelector('.goo-preview')
		const image = container.querySelector('.goo-preview__media')

		expect(root?.classList.contains('goo-preview--background-dots')).toBe(true)
		expect(root?.getAttribute('style')).toContain('--goo-preview-tint: #ba8cff')
		expect(imageByRole).toBe(image)
		expect(image?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(image?.getAttribute('alt')).toBe('Brush preset')
		expect(getByText('42 px')).toBeTruthy()
	})

	it('supports compact checker previews without forcing an image role', () => {
		const { container } = render(GooPreview, {
			props: {
				background: 'checker',
				size: 'sm'
			}
		})

		const root = container.querySelector('.goo-preview')

		expect(root?.getAttribute('role')).toBeNull()
		expect(root?.classList.contains('goo-preview--sm')).toBe(true)
		expect(root?.classList.contains('goo-preview--background-checker')).toBe(true)
	})
})
