import { fireEvent, render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GooToast from '../GooToast.svelte'
import GooToaster from '../GooToaster.svelte'
import { toast } from '../index.ts'
import { _resetToastStoreForTests, toastStore } from '../toast-service.svelte.ts'
import type { Toast } from '../types.ts'

function makeToast(overrides: Partial<Toast> = {}): Toast {
	return {
		id: overrides.id ?? 'test-1',
		variant: overrides.variant ?? 'info',
		title: overrides.title ?? 'Hello',
		message: overrides.message,
		duration: overrides.duration ?? 0,
		dismissible: overrides.dismissible ?? true,
		action: overrides.action,
		icon: overrides.icon ?? 'ℹ',
		createdAt: overrides.createdAt ?? Date.now()
	}
}

describe('toast service', () => {
	beforeEach(() => {
		_resetToastStoreForTests()
	})

	it('adds toasts for each variant helper', () => {
		toast.info('I')
		toast.success('S')
		toast.warning('W')
		toast.error('E')

		expect(toastStore.toasts.map(t => t.variant)).toEqual([
			'info', 'success', 'warning', 'error'
		])
	})

	it('errors are sticky by default', () => {
		toast.error('Boom')
		expect(toastStore.toasts[0]?.duration).toBe(0)
	})

	it('non-error variants default to 5000ms', () => {
		toast.success('Saved')
		expect(toastStore.toasts[0]?.duration).toBe(5000)
	})

	it('explicit duration overrides the variant default', () => {
		toast.error('Slow', { duration: 1000 })
		expect(toastStore.toasts[0]?.duration).toBe(1000)
	})

	it('dedups by id (re-issuing replaces the existing entry)', () => {
		toast.info('First', { id: 'same' })
		toast.info('Second', { id: 'same' })

		expect(toastStore.toasts.length).toBe(1)
		expect(toastStore.toasts[0]?.title).toBe('Second')
	})

	it('dismiss removes by id', () => {
		const id = toast.info('Bye')
		toast.dismiss(id)
		expect(toastStore.toasts.length).toBe(0)
	})

	it('clear empties the queue', () => {
		toast.info('a')
		toast.info('b')
		toast.info('c')
		toast.clear()
		expect(toastStore.toasts.length).toBe(0)
	})
})

describe('GooToast', () => {
	it('renders title, message, and variant modifier class', () => {
		const ondismiss = vi.fn()
		const { container } = render(GooToast, {
			props: {
				toast: makeToast({ variant: 'success', title: 'Saved', message: 'All good' }),
				ondismiss
			}
		})

		const root = container.querySelector('.goo-toast')
		expect(root?.classList.contains('goo-toast--success')).toBe(true)
		expect(root?.getAttribute('role')).toBe('status')
		expect(container.querySelector('.goo-toast__title')?.textContent).toBe('Saved')
		expect(container.querySelector('.goo-toast__message')?.textContent).toBe('All good')
	})

	it('dismiss button calls ondismiss with the toast id', async() => {
		const ondismiss = vi.fn()
		const { container } = render(GooToast, {
			props: {
				toast: makeToast({ id: 'pick-me' }),
				ondismiss
			}
		})

		const button = container.querySelector('.goo-toast__dismiss') as HTMLButtonElement
		await fireEvent.click(button)

		expect(ondismiss).toHaveBeenCalledWith('pick-me')
	})

	it('action button fires the action and dismisses', async() => {
		const onClick = vi.fn()
		const ondismiss = vi.fn()

		const { container } = render(GooToast, {
			props: {
				toast: makeToast({
					id: 'with-action',
					action: { label: 'Undo', onClick }
				}),
				ondismiss
			}
		})

		const action = container.querySelector('.goo-toast__action') as HTMLButtonElement
		await fireEvent.click(action)

		expect(onClick).toHaveBeenCalledOnce()
		expect(ondismiss).toHaveBeenCalledWith('with-action')
	})

	it('renders a progress bar only when duration > 0', () => {
		const ondismiss = vi.fn()

		const { container: stickyContainer } = render(GooToast, {
			props: { toast: makeToast({ duration: 0 }), ondismiss }
		})
		expect(stickyContainer.querySelector('.goo-toast__progress')).toBeNull()

		const { container: timedContainer } = render(GooToast, {
			props: { toast: makeToast({ id: 'timed', duration: 5000 }), ondismiss }
		})
		expect(timedContainer.querySelector('.goo-toast__progress')).not.toBeNull()
	})

	it('hides the dismiss button when dismissible is false', () => {
		const { container } = render(GooToast, {
			props: {
				toast: makeToast({ dismissible: false }),
				ondismiss: vi.fn()
			}
		})
		expect(container.querySelector('.goo-toast__dismiss')).toBeNull()
	})

	it('does not start duplicate auto-dismiss frames on repeated resume events', async() => {
		const requestAnimationFrameSpy = vi
			.spyOn(window, 'requestAnimationFrame')
			.mockImplementation(() => 1)
		const cancelAnimationFrameSpy = vi
			.spyOn(window, 'cancelAnimationFrame')
			.mockImplementation(() => undefined)
		try {
			const { container } = render(GooToast, {
				props: {
					toast: makeToast({ duration: 5000 }),
					ondismiss: vi.fn()
				}
			})
			await Promise.resolve()
			const toastElement = container.querySelector<HTMLElement>('.goo-toast')!

			await fireEvent.mouseLeave(toastElement)
			await fireEvent.focusOut(toastElement)

			expect(requestAnimationFrameSpy).toHaveBeenCalledOnce()
			expect(cancelAnimationFrameSpy).not.toHaveBeenCalled()
		} finally {
			requestAnimationFrameSpy.mockRestore()
			cancelAnimationFrameSpy.mockRestore()
		}
	})
})

describe('GooToaster', () => {
	beforeEach(() => {
		_resetToastStoreForTests()
	})

	afterEach(() => {
		_resetToastStoreForTests()
	})

	it('has correct ARIA attributes on the container', () => {
		const { container } = render(GooToaster)
		const root = container.querySelector('.goo-toaster')
		expect(root?.getAttribute('aria-live')).toBe('polite')
		expect(root?.getAttribute('aria-atomic')).toBe('false')
	})

	it('applies the position modifier class', () => {
		const { container } = render(GooToaster, {
			props: { position: 'bottom-center' }
		})
		expect(container.querySelector('.goo-toaster--bottom-center')).not.toBeNull()
	})

	it('renders toasts from the store', async() => {
		const { container } = render(GooToaster)
		toast.success('First')
		toast.error('Second')
		await Promise.resolve()

		const items = container.querySelectorAll('.goo-toast')
		expect(items.length).toBe(2)
	})
})
