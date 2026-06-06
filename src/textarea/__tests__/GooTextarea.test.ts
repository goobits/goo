import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooTextarea from '../GooTextarea.svelte'

describe('GooTextarea', () => {
	it('renders a native textarea without a custom element host', () => {
		const { container } = render(GooTextarea, {
			props: {
				value: 'Hello',
				placeholder: 'Message',
				rows: 4
			}
		})

		const textarea = container.querySelector<HTMLTextAreaElement>('.goo-textarea__input')

		expect(container.querySelector('goo-textarea')).toBeNull()
		expect(textarea?.value).toBe('Hello')
		expect(textarea?.placeholder).toBe('Message')
		expect(textarea?.rows).toBe(4)
	})

	it('emits input and change callbacks from the Svelte component', async() => {
		const oninput = vi.fn()
		const onchange = vi.fn()
		const { container } = render(GooTextarea, {
			props: {
				value: 'old',
				oninput,
				onchange
			}
		})
		const textarea = container.querySelector<HTMLTextAreaElement>('.goo-textarea__input')!

		await fireEvent.input(textarea, { target: { value: 'draft' } })
		await fireEvent.change(textarea, { target: { value: 'done' } })

		expect(oninput).toHaveBeenCalledExactlyOnceWith('draft', 'old')
		expect(onchange).toHaveBeenCalledExactlyOnceWith('done', 'old')
	})
})
