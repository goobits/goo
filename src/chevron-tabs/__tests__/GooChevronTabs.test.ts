import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
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

		await rerender({ tabs: [tabs[0]], activeId: 'kernel', onclose })
		await fireEvent.click(container.querySelector<HTMLButtonElement>('.goo-chevron-tabs__close')!)
		expect(onclose).toHaveBeenCalledOnce()

		await rerender({ tabs: [tabs[0]], activeId: 'kernel', allowClosingLastTab: true, onclose })
		await fireEvent.click(container.querySelector<HTMLButtonElement>('.goo-chevron-tabs__close')!)
		expect(onclose).toHaveBeenCalledWith('kernel')
	})

	it('renames tabs inline without changing tab chrome structure', async() => {
		const onrename = vi.fn()
		const { container, getByLabelText } = render(GooChevronTabs, {
			props: { tabs, activeId: 'kernel', renameLabel: 'Rename shell tab', onrename }
		})
		const tab = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="kernel"]')!

		await fireEvent.doubleClick(tab)
		const input = getByLabelText('Rename shell tab') as HTMLInputElement
		expect(input.value).toBe('Kernel')

		await fireEvent.input(input, { target: { value: 'ops' } })
		await fireEvent.keyDown(input, { key: 'Enter' })

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

	it('moves dragged tabs with visible drop feedback', async() => {
		const onmove = vi.fn()
		const { container } = render(GooChevronTabs, {
			props: {
				tabs,
				activeId: 'kernel',
				onmove,
				dropTargetAttributes: (index: number) => ({ 'data-test-drop-index': String(index) })
			}
		})
		const source = container.querySelector<HTMLElement>('[data-goo-chevron-tab-id="logs"]')!
		const target = container.querySelector<HTMLElement>('[data-test-drop-index="0"]')!

		await fireEvent.dragStart(source)
		await fireEvent.dragOver(target)
		await tick()

		expect(source.classList.contains('goo-chevron-tabs__tab--dragging')).toBe(true)
		expect(target.classList.contains('goo-chevron-tabs__drop-target--active')).toBe(true)

		await fireEvent.drop(target)

		expect(onmove).toHaveBeenCalledExactlyOnceWith('logs', 0)
	})
})
