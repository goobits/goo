import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooChevronTabs from '../GooChevronTabs.svelte'

const tabs = [
	{ id: 'kernel', name: 'Kernel', accent: '#79f2b0' },
	{ id: 'tests', name: 'Tests', status: 'working' as const },
	{ id: 'logs', name: 'Logs', status: 'done' as const, statusUser: 'Codex' }
]

describe('GooChevronTabs', () => {
	it('selects tabs and exposes active tab state', async() => {
		const onselect = vi.fn()
		const { container } = render(GooChevronTabs, {
			props: { tabs, activeId: 'kernel', onselect }
		})

		const kernel = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="kernel"]')!
		const tests = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="tests"]')!

		expect(kernel.getAttribute('aria-selected')).toBe('true')
		expect(tests.getAttribute('aria-selected')).toBe('false')

		await fireEvent.click(tests)

		expect(onselect).toHaveBeenCalledExactlyOnceWith('tests')
	})

	it('shows per-tab agent activity indicators without changing tab names', () => {
		const { getByLabelText } = render(GooChevronTabs, {
			props: {
				tabs: [ ...tabs, { id: 'blocked', name: 'Blocked', status: 'needsAttention' } ],
				activeId: 'kernel'
			}
		})

		expect(getByLabelText('Tests agent working').textContent).toContain('🤖')
		expect(getByLabelText('Logs agent done').textContent).toContain('🔔')
		expect(getByLabelText('Blocked needs attention')).toBeTruthy()
	})

	it('hides the done notification for the active tab like AW', () => {
		const { getByLabelText, queryByLabelText } = render(GooChevronTabs, {
			props: { tabs, activeId: 'logs' }
		})

		expect(getByLabelText('Tests agent working').textContent).toContain('🤖')
		expect(queryByLabelText('Logs agent done')).toBeNull()
	})

	it('adds and closes tabs while preserving the last-tab guard', async() => {
		const onadd = vi.fn()
		const onclose = vi.fn()
		const { container, getByRole, rerender } = render(GooChevronTabs, {
			props: { tabs, activeId: 'kernel', addLabel: 'Add shell tab', onadd, onclose }
		})

		await fireEvent.click(getByRole('button', { name: 'Add shell tab' }))
		await fireEvent.click(getByRole('button', { name: 'Close Tests' }))

		expect(onadd).toHaveBeenCalledOnce()
		expect(onclose).toHaveBeenCalledWith('tests')

		await rerender({ tabs: [ tabs[0] ], activeId: 'kernel', onclose })
		expect(container.querySelector<HTMLButtonElement>('.goo-chevron-tabs__close')).toBeNull()
		expect(onclose).toHaveBeenCalledOnce()

		await rerender({ tabs: [ tabs[0] ], activeId: 'kernel', allowClosingLastTab: true, onclose })
		await fireEvent.click(container.querySelector<HTMLButtonElement>('.goo-chevron-tabs__close')!)
		expect(onclose).toHaveBeenCalledWith('kernel')
	})

	it('renames tabs inline with contenteditable text without changing tab chrome structure', async() => {
		const onrename = vi.fn()
		const { container, getByLabelText } = render(GooChevronTabs, {
			props: { tabs, activeId: 'kernel', renameLabel: 'Rename shell tab', onrename }
		})
		const tab = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="kernel"]')!

		await fireEvent.doubleClick(tab)
		const editor = getByLabelText('Rename shell tab') as HTMLElement
		expect(editor.getAttribute('contenteditable')).toBe('true')
		expect(editor.textContent).toBe('Kernel')

		editor.textContent = 'ops'
		await fireEvent.keyDown(editor, { key: 'Enter' })

		expect(onrename).toHaveBeenCalledExactlyOnceWith('kernel', 'ops')
		expect(container.querySelectorAll('.goo-chevron-tabs__tab')).toHaveLength(3)
	})

	it('supports keyboard tab navigation and delete close', async() => {
		const onselect = vi.fn()
		const onclose = vi.fn()
		const { container } = render(GooChevronTabs, {
			props: { tabs, activeId: 'tests', onselect, onclose }
		})
		const active = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="tests"]')!

		await fireEvent.keyDown(active, { key: 'ArrowRight' })
		await fireEvent.keyDown(active, { key: 'Home' })
		await fireEvent.keyDown(active, { key: 'End' })
		await fireEvent.keyDown(active, { key: 'Delete' })

		expect(onselect).toHaveBeenNthCalledWith(1, 'logs')
		expect(onselect).toHaveBeenNthCalledWith(2, 'kernel')
		expect(onselect).toHaveBeenNthCalledWith(3, 'logs')
		expect(onclose).toHaveBeenCalledExactlyOnceWith('tests')
	})

	it('moves dragged tabs with visible lift feedback and no drop-slot gaps', async() => {
		const onmove = vi.fn()
		const { container } = render(GooChevronTabs, {
			props: {
				tabs,
				activeId: 'kernel',
				onmove,
				dropTargetAttributes: (index: number) => ({ 'data-test-drop-index': String(index) })
			}
		})
		const rail = container.querySelector<HTMLElement>('.goo-chevron-tabs__rail')!
		const source = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="logs"]')!
		expect(container.querySelectorAll('.goo-chevron-tabs__drop-target')).toHaveLength(0)

		for (const [ index, element ] of Array.from(
			container.querySelectorAll<HTMLElement>('.goo-chevron-tabs__tab')
		).entries()) {
			element.getBoundingClientRect = () =>
				({
					left: index * 100,
					right: index * 100 + 90,
					top: 0,
					bottom: 28,
					width: 90,
					height: 28,
					x: index * 100,
					y: 0,
					toJSON: () => ({})
				}) as DOMRect
		}

		await fireEvent.pointerDown(source, { button: 0, clientX: 250, pointerId: 1 })
		await fireEvent.pointerMove(rail, { clientX: -80, pointerId: 1 })
		expect(source.classList.contains('goo-chevron-tabs__tab--dragging')).toBe(true)

		await fireEvent.pointerUp(rail, { clientX: -80, pointerId: 1 })

		expect(onmove).toHaveBeenCalledExactlyOnceWith('logs', 0)
	})
})
