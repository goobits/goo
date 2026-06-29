import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GooButtonGroup from '../GooButtonGroup.svelte'

describe('GooButtonGroup', () => {
	it('renders option buttons without a custom element host', () => {
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'center',
				options: [
					{ key: 'left', value: 'Left' },
					{ key: 'center', value: 'Center' },
					{ key: 'right', value: 'Right' }
				]
			}
		})

		const group = container.querySelector('.goo-button-group')

		expect(container.querySelector('goo-button-group')).toBeNull()
		expect(group?.getAttribute('role')).toBe('group')
		expect(group?.getAttribute('tabindex')).toBeNull()
		expect(group?.querySelector('.goo-button[data-key="left"]')?.getAttribute('tabindex')).toBe('-1')
		expect(group?.querySelector('.goo-button[data-key="center"]')?.getAttribute('tabindex')).toBe('0')
		expect(group?.querySelector('.goo-button[data-key="center"]')?.classList.contains('goo-button--selected')).toBe(true)
	})

	it('emits the changed key and updates single selection', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				options: [
					{ key: 'left', value: 'Left' },
					{ key: 'right', value: 'Right' }
				]
			}
		})

		await fireEvent.click(container.querySelector('.goo-button[data-key="right"]')!)

		expect(onchange).toHaveBeenCalledExactlyOnceWith('right')
		expect(container.querySelector('.goo-button[data-key="left"]')?.classList.contains('goo-button--selected')).toBe(false)
		expect(container.querySelector('.goo-button[data-key="right"]')?.classList.contains('goo-button--selected')).toBe(true)
	})

	it('exposes selected index CSS variables for animated single selection', async() => {
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				options: [
					{ key: 'left', value: 'Left' },
					{ key: 'center', value: 'Center' },
					{ key: 'right', value: 'Right' }
				]
			}
		})
		const group = container.querySelector<HTMLElement>('.goo-button-group')!

		expect(group.classList.contains('goo-button-group--single-select')).toBe(true)
		expect(group.style.getPropertyValue('--goo-button-group-option-count').trim()).toBe('3')
		expect(group.style.getPropertyValue('--goo-button-group-selected-index').trim()).toBe('0')

		await fireEvent.click(container.querySelector('.goo-button[data-key="right"]')!)

		expect(group.style.getPropertyValue('--goo-button-group-selected-index').trim()).toBe('2')
	})

	it('supports multi-select values in the Svelte component', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				onchange,
				allowMultiple: true,
				allowToggle: true,
				value: [ 'bold' ],
				options: [
					{ key: 'bold', value: 'Bold' },
					{ key: 'italic', value: 'Italic' }
				]
			}
		})

		await fireEvent.click(container.querySelector('.goo-button[data-key="italic"]')!)
		await fireEvent.click(container.querySelector('.goo-button[data-key="bold"]')!)

		expect(onchange).toHaveBeenLastCalledWith([ 'italic' ])
		expect(container.querySelector('.goo-button[data-key="bold"]')?.classList.contains('goo-button--selected')).toBe(false)
		expect(container.querySelector('.goo-button[data-key="italic"]')?.classList.contains('goo-button--selected')).toBe(true)
	})

	it('emits full value changes for controller bindings', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				options: [
					{ key: 'left', value: 'Left' },
					{ key: 'right', value: 'Right' }
				]
			}
		})

		await fireEvent.click(container.querySelector('.goo-button[data-key="right"]')!)

		expect(onchange).toHaveBeenCalledExactlyOnceWith('right')
	})

	it('moves real DOM focus when navigating with the keyboard', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				options: [
					{ key: 'left', value: 'Left' },
					{ key: 'right', value: 'Right' }
				]
			}
		})
		const left = container.querySelector<HTMLButtonElement>('.goo-button[data-key="left"]')!
		const right = container.querySelector<HTMLButtonElement>('.goo-button[data-key="right"]')!

		left.focus()
		await fireEvent.keyDown(left, { key: 'ArrowRight' })
		await Promise.resolve()

		expect(document.activeElement).toBe(right)
		expect(left.getAttribute('tabindex')).toBe('-1')
		expect(right.getAttribute('tabindex')).toBe('0')
		expect(right.classList.contains('goo-button--selected')).toBe(true)
		expect(onchange).toHaveBeenCalledExactlyOnceWith('right')
	})

	it('selects the focused button from activation aliases and contains handled keys', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				allowMultiple: true,
				options: [
					{ key: 'left', value: 'Left' },
					{ key: 'right', value: 'Right' }
				]
			}
		})
		const left = container.querySelector<HTMLButtonElement>('.goo-button[data-key="left"]')!
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		left.focus()
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'Spacebar'
		})
		left.dispatchEvent(event)
		await Promise.resolve()

		expect(event.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(onchange).toHaveBeenCalledExactlyOnceWith([])
		expect(left.classList.contains('goo-button--selected')).toBe(false)
	})
})
