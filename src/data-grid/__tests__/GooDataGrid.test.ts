import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import GooDataGrid from '../GooDataGrid.svelte'

describe('GooDataGrid', () => {
	it('renders rows and columns without a custom element host', () => {
		const { container } = render(GooDataGrid, {
			props: {
				ariaLabel: 'People',
				columns: [
					{ key: 'email', label: 'Email' },
					{ align: 'end', key: 'orders', label: 'Orders' }
				],
				rows: [
					{ email: 'buyer@example.com', orders: 2 },
					{ email: 'admin@example.com', orders: 4 }
				]
			}
		})

		const grid = container.querySelector('.goo-data-grid')

		expect(container.querySelector('goo-data-grid')).toBeNull()
		expect(grid?.getAttribute('role')).toBe('table')
		expect(grid?.getAttribute('aria-label')).toBe('People')
		expect(container.textContent).toContain('buyer@example.com')
		expect(container.textContent).toContain('4')
		expect(container.querySelectorAll('[role="row"]')).toHaveLength(3)
	})

	it('renders an empty state', () => {
		const { container } = render(GooDataGrid, {
			props: {
				columns: [ { key: 'email', label: 'Email' } ],
				emptyLabel: 'No people',
				rows: []
			}
		})

		expect(container.querySelector('.goo-data-grid__state')?.textContent).toContain('No people')
	})

	it('renders lucide sort icons for sortable headers', async() => {
		const { container } = render(GooDataGrid, {
			props: {
				columns: [ { key: 'name', label: 'Name', sortable: true } ],
				rows: [ { name: 'B' }, { name: 'A' } ],
				sortable: true
			}
		})

		const indicator = container.querySelector('.goo-data-grid__sort-indicator')!
		expect(indicator.querySelector('svg')).not.toBeNull()
		expect(indicator.textContent?.trim()).toBe('')

		await fireEvent.click(container.querySelector('.goo-data-grid__sort-button')!)

		expect(indicator.querySelector('svg')).not.toBeNull()
		expect(container.querySelector('.goo-data-grid__header-cell')?.getAttribute('aria-sort')).toBe('ascending')
	})

	it('emits row activation callbacks', async() => {
		const onrowactivate = vi.fn()
		const { container } = render(GooDataGrid, {
			props: {
				columns: [ { key: 'email', label: 'Email' } ],
				getRowKey: (row: { id: string }) => row.id,
				onrowactivate,
				rows: [ { email: 'buyer@example.com', id: 'buyer' } ]
			}
		})

		const row = container.querySelector<HTMLElement>('.goo-data-grid__row--body')!
		await fireEvent.keyDown(row, { key: 'Enter' })

		expect(onrowactivate).toHaveBeenCalledOnce()
		expect(onrowactivate.mock.calls[0]?.[0]).toEqual({
			email: 'buyer@example.com',
			id: 'buyer'
		})
		expect(onrowactivate.mock.calls[0]?.[1]).toBe(0)
	})

	it('uses role="grid" and a single roving-tabindex row in interactive mode', () => {
		const { container } = render(GooDataGrid, {
			props: {
				columns: [ { key: 'email', label: 'Email' } ],
				onrowactivate: vi.fn(),
				rows: [
					{ email: 'a@example.com' },
					{ email: 'b@example.com' },
					{ email: 'c@example.com' }
				]
			}
		})

		expect(container.querySelector('.goo-data-grid')?.getAttribute('role')).toBe('grid')
		const rows = container.querySelectorAll<HTMLElement>('.goo-data-grid__row--body')
		expect([ ...rows ].map(r => r.getAttribute('tabindex'))).toEqual([ '0', '-1', '-1' ])
	})

	it('moves roving focus between rows with ArrowDown/ArrowUp', async() => {
		const { container } = render(GooDataGrid, {
			props: {
				columns: [ { key: 'email', label: 'Email' } ],
				onrowactivate: vi.fn(),
				rows: [
					{ email: 'a@example.com' },
					{ email: 'b@example.com' },
					{ email: 'c@example.com' }
				]
			}
		})
		const rows = () => container.querySelectorAll<HTMLElement>('.goo-data-grid__row--body')

		await fireEvent.keyDown(rows()[0]!, { key: 'ArrowDown' })
		await tick()
		expect([ ...rows() ].map(r => r.getAttribute('tabindex'))).toEqual([ '-1', '0', '-1' ])

		await fireEvent.keyDown(rows()[1]!, { key: 'End' })
		await tick()
		expect([ ...rows() ].map(r => r.getAttribute('tabindex'))).toEqual([ '-1', '-1', '0' ])

		await fireEvent.keyDown(rows()[2]!, { key: 'ArrowUp' })
		await tick()
		expect([ ...rows() ].map(r => r.getAttribute('tabindex'))).toEqual([ '-1', '0', '-1' ])
	})
})
