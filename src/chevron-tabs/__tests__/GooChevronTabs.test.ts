import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GooChevronTabs from '../GooChevronTabs.svelte'

describe('GooChevronTabs', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		delete (HTMLElement.prototype as HTMLElement & { scrollBy?: unknown }).scrollBy
		document.querySelectorAll('.goo-popout').forEach(element => element.remove())
		document.querySelectorAll('[aria-describedby]').forEach(element => element.removeAttribute('aria-describedby'))
	})

	it('opens an inline tab title editor on double-click', async() => {
		const onrename = vi.fn()
		const { getByRole, getByTestId } = render(GooChevronTabs, {
			props: {
				activeId: 'kernel',
				tabs: [ { id: 'kernel', name: 'Kernel' } ],
				tabAttributes: tab => ({ 'data-testid': `tab-${ tab.id }` }),
				onadd: vi.fn(),
				onrename
			}
		})

		await fireEvent.dblClick(getByTestId('tab-kernel'))
		const editor = getByRole('textbox', { name: 'Rename tab' })
		expect(editor.textContent).toBe('Kernel')

		editor.textContent = 'Core'
		await fireEvent.blur(editor)

		expect(onrename).toHaveBeenCalledExactlyOnceWith('kernel', 'Core')
	})

	it('supports tab keyboard navigation without reordering', async() => {
		const onmove = vi.fn()
		const onselect = vi.fn()
		const { getByTestId } = render(GooChevronTabs, {
			props: {
				activeId: 'kernel',
				tabs: [
					{ id: 'kernel', name: 'Kernel' },
					{ id: 'tests', name: 'Tests' }
				],
				tabAttributes: tab => ({ 'data-testid': `tab-${ tab.id }` }),
				onadd: vi.fn(),
				onmove,
				onselect
			}
		})

		await fireEvent.keyDown(getByTestId('tab-kernel'), { key: 'ArrowRight' })
		await fireEvent.keyDown(getByTestId('tab-tests'), { key: 'Home' })

		expect(onselect).toHaveBeenNthCalledWith(1, 'tests')
		expect(onselect).toHaveBeenNthCalledWith(2, 'kernel')
		expect(onmove).not.toHaveBeenCalled()
	})

	it('omits unavailable mutation controls for read-only tabs', () => {
		const onselect = vi.fn()
		const { queryByRole, getByTestId } = render(GooChevronTabs, {
			props: {
				activeId: 'kernel',
				tabs: [
					{ id: 'kernel', name: 'Kernel' },
					{ id: 'tests', name: 'Tests' }
				],
				tabAttributes: tab => ({ 'data-testid': `tab-${ tab.id }` }),
				onselect
			}
		})

		expect(queryByRole('button', { name: 'Add tab' })).toBeNull()
		expect(queryByRole('button', { name: 'Close Kernel tab' })).toBeNull()
		expect(dispatchKey(getByTestId('tab-kernel'), 'F2').defaultPrevented).toBe(false)
		expect(dispatchKey(getByTestId('tab-kernel'), 'Delete').defaultPrevented).toBe(false)
	})

	it('supports keyboard rename and close commands', async() => {
		const onclose = vi.fn()
		const onrename = vi.fn()
		const { getByRole, getByTestId } = render(GooChevronTabs, {
			props: {
				activeId: 'kernel',
				allowClosingLastTab: true,
				tabs: [ { id: 'kernel', name: 'Kernel' } ],
				tabAttributes: tab => ({ 'data-testid': `tab-${ tab.id }` }),
				onadd: vi.fn(),
				onclose,
				onrename
			}
		})

		await fireEvent.keyDown(getByTestId('tab-kernel'), { key: 'F2' })
		const editor = getByRole('textbox', { name: 'Rename tab' })
		editor.textContent = 'Core'
		await fireEvent.keyDown(editor, { key: 'Enter' })
		await fireEvent.blur(editor)
		await fireEvent.keyDown(getByTestId('tab-kernel'), { key: 'Delete' })

		expect(onrename).toHaveBeenCalledExactlyOnceWith('kernel', 'Core')
		expect(onclose).toHaveBeenCalledExactlyOnceWith('kernel')
	})

	it('renders Lucide activity icons for agent tab statuses', async() => {
		const { container } = render(GooChevronTabs, {
			props: {
				activeId: 'working',
				tabs: [
					{ id: 'working', name: 'Agent', status: 'working' },
					{ id: 'done', name: 'Review', status: 'done' },
					{ id: 'needs-attention', name: 'Blocked', status: 'needsAttention' }
				],
				onadd: vi.fn()
			}
		})

		expect(container.querySelector('.goo-chevron-tabs__activity-emoji')).toBeNull()
		const workingActivity = container.querySelector<HTMLElement>('[aria-label="Agent agent working"]')
		expect(workingActivity?.querySelector('svg.lucide-bot')).not.toBeNull()
		expect(workingActivity?.getAttribute('title')).toBeNull()
		expect(container.querySelector('[aria-label="Review agent done"] svg.lucide-bell-ring')).not.toBeNull()
		expect(
			container.querySelector('[aria-label="Blocked needs attention"] svg.lucide-circle-alert')
		).not.toBeNull()

		workingActivity?.dispatchEvent(new MouseEvent('mouseenter'))
		await new Promise(resolve => setTimeout(resolve))

		expect(document.querySelector('.goo-popout.goo-tooltip')).not.toBeNull()
	})

	it('selects focused tabs from Spacebar and contains handled keys', () => {
		const onselect = vi.fn()
		const { container } = render(GooChevronTabs, {
			props: {
				activeId: 'one',
				tabs: [
					{ id: 'one', name: 'One' },
					{ id: 'two', name: 'Two' }
				],
				onadd: vi.fn(),
				onselect
			}
		})
		const tab = container.querySelectorAll<HTMLElement>('.goo-chevron-tabs__tab')[1]!
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		const event = dispatchKey(tab, 'Spacebar')

		expect(event.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(onselect).toHaveBeenCalledExactlyOnceWith('two')
	})

	it('contains arrow navigation inside the overflow menu', async() => {
		vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400)
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)
		Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
			configurable: true,
			value: vi.fn()
		})
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
			callback(0)
			return 1
		})
		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
		const onselect = vi.fn()
		const { container, getByRole, getAllByRole } = render(GooChevronTabs, {
			props: {
				activeId: 'one',
				tabs: [
					{ id: 'one', name: 'One' },
					{ id: 'two', name: 'Two' },
					{ id: 'three', name: 'Three' }
				],
				onadd: vi.fn(),
				onselect
			}
		})
		await tick()
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		await fireEvent.click(getByRole('button', { name: 'All sessions' }))
		await tick()
		const menu = getByRole('menu', { name: 'Sessions' })
		const event = dispatchKey(menu, 'ArrowDown')

		expect(event.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(document.activeElement).toBe(getAllByRole('menuitem')[1])
	})
})

function dispatchKey(element: HTMLElement, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		bubbles: true,
		cancelable: true,
		key
	})
	element.dispatchEvent(event)
	return event
}
