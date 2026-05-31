import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import GooLabelHost from './GooLabelHost.svelte'

describe('GooLabel', () => {
	it('renders label content and required state', () => {
		const { container } = render(GooLabelHost, {
			props: {
				forId: 'email',
				required: true,
				text: 'Email'
			}
		})

		const label = container.querySelector('label')
		expect(label?.classList.contains('goo-label')).toBe(true)
		expect(label?.getAttribute('for')).toBe('email')
		expect(label?.textContent?.replace(/\s+/g, '')).toBe('Email*')
		expect(container.querySelector('.goo-label__required')).not.toBeNull()
	})

	it('renders disabled state without a disabled attribute on the label', () => {
		const { getByText } = render(GooLabelHost, {
			props: {
				disabled: true,
				text: 'Disabled'
			}
		})

		const label = getByText('Disabled').closest('label')

		expect(label?.dataset.disabled).toBe('true')
		expect(label?.hasAttribute('disabled')).toBe(false)
	})
})
