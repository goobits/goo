import { render } from '@testing-library/svelte'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import Harness from './VirtualGridHarness.svelte'

describe('VirtualGrid', () => {
	beforeAll(() => {
		// jsdom has no matchMedia; VirtualGrid probes it for constrained devices on init.
		vi.stubGlobal('matchMedia', (query: string) => ({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {}
		}))
	})

	it('defaults the container to role="presentation" with no semantic aria', () => {
		const { container } = render(Harness, { props: {} })
		const grid = container.querySelector('.goo-virtual-grid')!

		expect(grid.getAttribute('role')).toBe('presentation')
		expect(grid.getAttribute('aria-label')).toBeNull()
		expect(grid.getAttribute('aria-rowcount')).toBeNull()
		expect(grid.getAttribute('aria-multiselectable')).toBeNull()
	})

	it('exposes a semantic grid container when accessibility props are set', () => {
		const { container } = render(Harness, {
			props: {
				role: 'grid',
				ariaLabel: 'Documents',
				ariaRowCount: 42,
				ariaMultiselectable: true
			}
		})
		const grid = container.querySelector('.goo-virtual-grid')!

		expect(grid.getAttribute('role')).toBe('grid')
		expect(grid.getAttribute('aria-label')).toBe('Documents')
		expect(grid.getAttribute('aria-rowcount')).toBe('42')
		expect(grid.getAttribute('aria-multiselectable')).toBe('true')
	})
})
