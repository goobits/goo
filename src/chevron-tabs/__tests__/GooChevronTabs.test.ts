import { render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooChevronTabs from '../GooChevronTabs.svelte'

describe('GooChevronTabs', () => {
	it('renders Lucide activity icons for agent tab statuses', () => {
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
		expect(container.querySelector('[aria-label="Agent agent working"] svg.lucide-bot')).not.toBeNull()
		expect(container.querySelector('[aria-label="Review agent done"] svg.lucide-bell-ring')).not.toBeNull()
		expect(
			container.querySelector('[aria-label="Blocked needs attention"] svg.lucide-circle-alert')
		).not.toBeNull()
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
