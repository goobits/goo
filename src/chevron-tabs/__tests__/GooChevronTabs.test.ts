import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooChevronTabs from '../GooChevronTabs.svelte'

describe('GooChevronTabs', () => {
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
})
