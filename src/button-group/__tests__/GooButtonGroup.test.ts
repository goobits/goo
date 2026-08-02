import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import { iconRegistry } from '../../icon/registry.ts'
import GooButtonGroup from '../GooButtonGroup.svelte'
import GooButtonGroupChildrenHost from './GooButtonGroupChildrenHost.svelte'

describe('GooButtonGroup', () => {
	it('renders registered icon names and keeps CSS icon classes as a fallback', () => {
		iconRegistry.register('button-group-test-icon', '<svg viewBox="0 0 16 16"><path d="M2 8h12"/></svg>')
		const { container } = render(GooButtonGroup, {
			props: {
				options: [
					{ id: 'registered', label: 'Registered', icon: 'button-group-test-icon' },
					{ id: 'class', label: 'Class', icon: 'custom-icon-class' }
				]
			}
		})

		expect(container.querySelector('[data-id="registered"] .goo-icon svg')).not.toBeNull()
		expect(container.querySelector('[data-id="class"] .custom-icon-class')).not.toBeNull()
	})

	it('renders option buttons without a custom element host', () => {
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'center',
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'center', label: 'Center' },
					{ id: 'right', label: 'Right' }
				]
			}
		})

		const group = container.querySelector('.goo-button-group')

		expect(container.querySelector('goo-button-group')).toBeNull()
		expect(group?.getAttribute('role')).toBe('group')
		expect(group?.getAttribute('tabindex')).toBeNull()
		expect(group?.querySelector('.goo-button[data-id="left"]')?.getAttribute('tabindex')).toBe('-1')
		expect(group?.querySelector('.goo-button[data-id="center"]')?.getAttribute('tabindex')).toBe('0')
		expect(group?.querySelector('.goo-button[data-id="center"]')?.classList.contains('goo-button--selected')).toBe(true)
	})

	it('emits the changed id and updates single selection', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'right', label: 'Right' }
				]
			}
		})

		await fireEvent.click(container.querySelector('.goo-button[data-id="right"]')!)

		expect(onchange).toHaveBeenCalledExactlyOnceWith('right')
		expect(container.querySelector('.goo-button[data-id="left"]')?.classList.contains('goo-button--selected')).toBe(false)
		expect(container.querySelector('.goo-button[data-id="right"]')?.classList.contains('goo-button--selected')).toBe(true)
	})

	it('uses direct child data ids as stable selection values', async() => {
		const { container, getByTestId } = render(GooButtonGroupChildrenHost)
		const tree = container.querySelector<HTMLButtonElement>('.goo-button[data-id="tree"]')!
		const table = container.querySelector<HTMLButtonElement>('.goo-button[data-id="table"]')!
		await tick()

		expect(tree.getAttribute('aria-pressed')).toBe('true')
		expect(table.getAttribute('aria-pressed')).toBe('false')

		await fireEvent.click(table)

		expect(getByTestId('button-group-child-value').textContent).toBe('table')
		expect(tree.getAttribute('aria-pressed')).toBe('false')
		expect(table.getAttribute('aria-pressed')).toBe('true')
	})

	it('keeps disabled options visible but unavailable', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				onchange,
				options: [
					{ id: 'previous', label: 'Previous', disabled: true },
					{ id: 'next', label: 'Next' }
				]
			}
		})
		const previous = container.querySelector<HTMLButtonElement>('.goo-button[data-id="previous"]')!
		const next = container.querySelector<HTMLButtonElement>('.goo-button[data-id="next"]')!

		expect(previous.disabled).toBe(true)
		expect(previous.classList.contains('goo-button--disabled')).toBe(true)
		expect(previous.getAttribute('tabindex')).toBe('-1')
		expect(next.getAttribute('tabindex')).toBe('0')

		await fireEvent.click(previous)

		expect(onchange).not.toHaveBeenCalled()
	})

	it('exposes selected index CSS variables for animated single selection', async() => {
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'center', label: 'Center' },
					{ id: 'right', label: 'Right' }
				]
			}
		})
		const group = container.querySelector<HTMLElement>('.goo-button-group')!

		expect(group.classList.contains('goo-button-group--single-select')).toBe(true)
		expect(group.style.getPropertyValue('--goo-button-group-option-count').trim()).toBe('3')
		expect(group.style.getPropertyValue('--goo-button-group-selected-index').trim()).toBe('0')

		await fireEvent.click(container.querySelector('.goo-button[data-id="right"]')!)

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
					{ id: 'bold', label: 'Bold' },
					{ id: 'italic', label: 'Italic' }
				]
			}
		})

		await fireEvent.click(container.querySelector('.goo-button[data-id="italic"]')!)
		await fireEvent.click(container.querySelector('.goo-button[data-id="bold"]')!)

		expect(onchange).toHaveBeenLastCalledWith([ 'italic' ])
		expect(container.querySelector('.goo-button[data-id="bold"]')?.classList.contains('goo-button--selected')).toBe(false)
		expect(container.querySelector('.goo-button[data-id="italic"]')?.classList.contains('goo-button--selected')).toBe(true)
	})

	it('emits full value changes for controller bindings', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'right', label: 'Right' }
				]
			}
		})

		await fireEvent.click(container.querySelector('.goo-button[data-id="right"]')!)

		expect(onchange).toHaveBeenCalledExactlyOnceWith('right')
	})

	it('moves real DOM focus when navigating with the keyboard', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'right', label: 'Right' }
				]
			}
		})
		const left = container.querySelector<HTMLButtonElement>('.goo-button[data-id="left"]')!
		const right = container.querySelector<HTMLButtonElement>('.goo-button[data-id="right"]')!

		left.focus()
		await fireEvent.keyDown(left, { key: 'ArrowRight' })
		await Promise.resolve()

		expect(document.activeElement).toBe(right)
		expect(left.getAttribute('tabindex')).toBe('-1')
		expect(right.getAttribute('tabindex')).toBe('0')
		expect(right.classList.contains('goo-button--selected')).toBe(true)
		expect(onchange).toHaveBeenCalledExactlyOnceWith('right')
	})

	it('wraps horizontal keyboard navigation at both boundaries', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'right',
				onchange,
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'center', label: 'Center' },
					{ id: 'right', label: 'Right' }
				]
			}
		})
		const left = container.querySelector<HTMLButtonElement>('.goo-button[data-id="left"]')!
		const right = container.querySelector<HTMLButtonElement>('.goo-button[data-id="right"]')!

		right.focus()
		await fireEvent.keyDown(right, { key: 'ArrowRight' })
		await Promise.resolve()

		expect(document.activeElement).toBe(left)
		expect(left.classList.contains('goo-button--selected')).toBe(true)
		expect(onchange).toHaveBeenLastCalledWith('left')

		await fireEvent.keyDown(left, { key: 'ArrowLeft' })
		await Promise.resolve()

		expect(document.activeElement).toBe(right)
		expect(right.classList.contains('goo-button--selected')).toBe(true)
		expect(onchange).toHaveBeenLastCalledWith('right')
	})

	it('uses vertical arrows for vertical groups and leaves horizontal arrows untouched', async() => {
		const parentKeydown = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'center',
				layout: 'vertical',
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'center', label: 'Center' },
					{ id: 'right', label: 'Right' }
				]
			}
		})
		const left = container.querySelector<HTMLButtonElement>('.goo-button[data-id="left"]')!
		const center = container.querySelector<HTMLButtonElement>('.goo-button[data-id="center"]')!
		container.addEventListener('keydown', parentKeydown)

		center.focus()
		await fireEvent.keyDown(center, { key: 'ArrowUp' })
		await Promise.resolve()

		expect(document.activeElement).toBe(left)
		expect(left.classList.contains('goo-button--selected')).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()

		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowRight'
		})
		left.dispatchEvent(event)
		await Promise.resolve()

		expect(event.defaultPrevented).toBe(false)
		expect(parentKeydown).toHaveBeenCalledExactlyOnceWith(expect.any(KeyboardEvent))
		expect(document.activeElement).toBe(left)
	})

	it('moves focus without changing selection in multi-select groups', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				allowMultiple: true,
				value: [ 'bold' ],
				onchange,
				options: [
					{ id: 'bold', label: 'Bold' },
					{ id: 'italic', label: 'Italic' }
				]
			}
		})
		const bold = container.querySelector<HTMLButtonElement>('.goo-button[data-id="bold"]')!
		const italic = container.querySelector<HTMLButtonElement>('.goo-button[data-id="italic"]')!

		bold.focus()
		await fireEvent.keyDown(bold, { key: 'ArrowRight' })
		await Promise.resolve()

		expect(document.activeElement).toBe(italic)
		expect(bold.classList.contains('goo-button--selected')).toBe(true)
		expect(italic.classList.contains('goo-button--selected')).toBe(false)
		expect(bold.getAttribute('tabindex')).toBe('-1')
		expect(italic.getAttribute('tabindex')).toBe('0')
		expect(onchange).not.toHaveBeenCalled()
	})

	it('selects the focused button from activation keys and contains handled events', async() => {
		const onchange = vi.fn()
		const { container } = render(GooButtonGroup, {
			props: {
				value: 'left',
				onchange,
				allowMultiple: true,
				options: [
					{ id: 'left', label: 'Left' },
					{ id: 'right', label: 'Right' }
				]
			}
		})
		const left = container.querySelector<HTMLButtonElement>('.goo-button[data-id="left"]')!
		const parentKeydown = vi.fn()
		container.addEventListener('keydown', parentKeydown)

		left.focus()
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: ' '
		})
		left.dispatchEvent(event)
		await Promise.resolve()

		expect(event.defaultPrevented).toBe(true)
		expect(parentKeydown).not.toHaveBeenCalled()
		expect(onchange).toHaveBeenCalledExactlyOnceWith([])
		expect(left.classList.contains('goo-button--selected')).toBe(false)
	})
})
