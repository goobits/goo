import { fireEvent, render, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GridPopoutPicker from '../grid-popout/GridPopoutPicker.svelte'
import type { GridPopoutItem } from '../grid-popout/types.ts'

vi.mock('@goobits/goo/popout', () => ({
	gooPopoutRuntime: {
		closeOutside: vi.fn()
	},
	createGooPopout: vi.fn((options: {
		content: HTMLElement
		className?: string
		onClose?: () => void
		onDestroy?: () => void
		onOpen?: (data: { element: HTMLElement }) => void
	}) => {
		const $element = document.createElement('div')
		$element.className = `goo-popout ${ options.className ?? '' }`.trim()
		$element.appendChild(options.content)
		document.body.appendChild($element)

		const instance = {
			get element() {
				return $element.isConnected ? $element : null
			},
			isOpen() {
				return $element.isConnected
			},
			close: vi.fn(async() => {
				options.onClose?.()
				await instance.destroy()
			}),
			destroy: vi.fn(async() => {
				$element.remove()
				options.onDestroy?.()
			})
		}

		options.onOpen?.({ element: $element })
		return instance
	})
}))

const items: GridPopoutItem[] = [
	{
		iconClass: 'sketch-icon-line',
		id: 'line',
		title: 'Line'
	},
	{
		iconSvg: {
			attributes: {
				fill: 'none',
				stroke: 'currentColor'
			},
			class: 'warp-icon',
			elements: [ {
				attributes: {
					d: 'M1 2L3 4',
					transform: 'translate(1 2)'
				},
				tag: 'path'
			} ],
			paths: [ {
				d: 'M1 2L3 4',
				transform: 'translate(1 2)'
			} ],
			viewBox: '0 0 24 24'
		},
		id: 'warp',
		title: 'Warp arc'
	}
]

describe('GridPopoutPicker', () => {
	afterEach(() => {
		vi.useRealTimers()
		document.body.querySelectorAll('.goo-popout').forEach(element => element.remove())
	})

	it('renders the Goo-owned trigger host with the selected option', () => {
		const { container, getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Subtool',
				class: 'goo-grid-trigger--icon-grid',
				dataParam: 'type',
				id: 'UISubTool',
				items,
				selected: 'line'
			}
		})

		const trigger = getByRole('button', { name: 'Subtool' })

		expect(container.querySelector('goo-grid-popout-trigger')).toBe(trigger)
		expect(trigger.id).toBe('UISubTool')
		expect(trigger.classList.contains('goo-grid-trigger--icon-grid')).toBe(true)
		expect(trigger.getAttribute('data-param')).toBe('type')
		expect(trigger.textContent).toContain('Line')
		expect(trigger.querySelector('.sketch-icon-line')).toBeTruthy()
		expect(trigger.getAttribute('aria-expanded')).toBe('false')
	})

	it('opens structured options, selects SVG icons, and closes the popout', async() => {
		const onchoose = vi.fn()
		const { getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Subtool',
				items,
				onchoose,
				popoutClass: 'goo-grid-popout--icon-grid',
				selected: 'line'
			}
		})

		const trigger = getByRole('button', { name: 'Subtool' })
		await fireEvent.click(trigger)

		expect(trigger.getAttribute('aria-expanded')).toBe('true')

		const selectedOption = getByRole('option', { name: 'Line' })
		expect(selectedOption.getAttribute('aria-selected')).toBe('true')
		expect(selectedOption.classList.contains('selected')).toBe(true)
		expect(selectedOption.querySelector('.goo-grid-picker-selected-mark svg path')?.getAttribute('d'))
			.toBe('M20 6 9 17l-5-5')

		const svgOption = getByRole('option', { name: 'Warp arc' })
		const svg = svgOption.querySelector('svg.warp-icon')
		expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
		expect(svg?.getAttribute('fill')).toBe('none')
		expect(svg?.getAttribute('stroke')).toBe('currentColor')
		expect(svg?.querySelector('path')?.getAttribute('d')).toBe('M1 2L3 4')
		expect(svg?.querySelector('path')?.getAttribute('transform')).toBe('translate(1 2)')

		await fireEvent.click(svgOption)

		expect(onchoose).toHaveBeenCalledExactlyOnceWith('warp')
		await waitFor(() => {
			expect(trigger.getAttribute('aria-expanded')).toBe('false')
			expect(trigger.textContent).toContain('Warp arc')
		})
		expect(trigger.querySelector('svg.warp-icon path')?.getAttribute('transform')).toBe('translate(1 2)')
		expect(document.body.querySelector('.goo-popout')).toBeNull()
	})

	it('renders Goo preview surfaces in the trigger and options when provided', async() => {
		const { getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Brush',
				items: [
					{
						id: 'brush',
						kicker: 'Brush preset',
						preview: {
							alt: 'Brush preview',
							background: 'dots',
							badge: '42 px',
							hue: '#ba8cff',
							src: 'data:image/png;base64,preview'
						},
						title: 'Brush'
					}
				],
				popoutClass: 'goo-grid-popout--preset',
				selected: 'brush'
			}
		})

		const trigger = getByRole('button', { name: 'Brush' })
		const triggerPreview = trigger.querySelector('.goo-grid-popout-trigger__preview.goo-preview')
		const triggerImage = triggerPreview?.querySelector('img')

		expect(triggerPreview?.classList.contains('goo-preview--background-dots')).toBe(true)
		expect(triggerPreview?.getAttribute('style')).toContain('--goo-preview-tint: #ba8cff')
		expect(triggerImage?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(triggerImage?.getAttribute('alt')).toBe('Brush preview')
		expect(trigger.textContent).toContain('Brush preset')

		await fireEvent.click(trigger)

		const option = getByRole('option', { name: 'Brush' })
		const optionPreview = option.querySelector('.goo-grid-picker__preview.goo-preview')
		const optionImage = optionPreview?.querySelector('img')

		expect(optionPreview?.classList.contains('goo-preview--background-dots')).toBe(true)
		expect(optionImage?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(optionImage?.getAttribute('alt')).toBe('Brush preview')
		expect(option.textContent).toContain('42 px')
		expect(document.body.querySelector('.goo-popout')?.classList.contains('goo-grid-popout--preset')).toBe(true)
	})

	it('reserves Goo preview surfaces before preview media is available', async() => {
		const { getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Brush',
				items: [
					{
						id: 'brush',
						kicker: 'Brush preset',
						preview: {
							alt: 'Brush preview',
							background: 'dots',
							src: ''
						},
						title: 'Brush'
					}
				],
				popoutClass: 'goo-grid-popout--preset',
				selected: 'brush'
			}
		})

		const trigger = getByRole('button', { name: 'Brush' })
		const triggerPreview = trigger.querySelector('.goo-grid-popout-trigger__preview.goo-preview')

		expect(triggerPreview).not.toBeNull()
		expect(triggerPreview?.querySelector('img')).toBeNull()

		await fireEvent.click(trigger)

		const option = getByRole('option', { name: 'Brush' })
		const optionPreview = option.querySelector('.goo-grid-picker__preview.goo-preview')

		expect(optionPreview).not.toBeNull()
		expect(optionPreview?.querySelector('img')).toBeNull()
	})

	it('updates open option previews when media arrives after the popout opens', async() => {
		const placeholderItems: GridPopoutItem[] = [
			{
				id: 'brush',
				kicker: 'Brush preset',
				preview: {
					alt: 'Brush preview',
					background: 'dots',
					src: ''
				},
				title: 'Brush'
			}
		]
		const loadedItems: GridPopoutItem[] = [
			{
				...placeholderItems[0],
				preview: {
					...placeholderItems[0].preview!,
					src: 'data:image/png;base64,preview'
				}
			}
		]
		const { getByRole, rerender } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Brush',
				items: placeholderItems,
				popoutClass: 'goo-grid-popout--preset',
				selected: 'brush'
			}
		})

		const trigger = getByRole('button', { name: 'Brush' })
		await fireEvent.click(trigger)

		const option = getByRole('option', { name: 'Brush' })
		const optionPreview = option.querySelector('.goo-grid-picker__preview.goo-preview')
		expect(optionPreview).not.toBeNull()
		expect(optionPreview?.querySelector('img')).toBeNull()

		await rerender({
			ariaLabel: 'Brush',
			items: loadedItems,
			popoutClass: 'goo-grid-popout--preset',
			selected: 'brush'
		})

		const loadedOptionImage = getByRole('option', { name: 'Brush' })
			.querySelector<HTMLImageElement>('.goo-grid-picker__preview.goo-preview img')
		expect(loadedOptionImage?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(loadedOptionImage?.getAttribute('alt')).toBe('Brush preview')
	})

	it('keeps legacy previewUrl items working', () => {
		const { getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Brush',
				items: [
					{
						id: 'brush',
						previewAlt: 'Brush preview',
						previewUrl: 'data:image/png;base64,preview',
						title: 'Brush'
					}
				],
				selected: 'brush'
			}
		})

		const triggerPreview = getByRole('button', { name: 'Brush' })
			.querySelector('.goo-grid-popout-trigger__preview.goo-preview img')

		expect(triggerPreview?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(triggerPreview?.getAttribute('alt')).toBe('Brush preview')
	})

	it('honors explicit icon-grid layout instead of forcing small lists to one column', async() => {
		const { getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Tool',
				items,
				popoutClass: 'goo-grid-popout--icon-grid',
				selected: 'line'
			}
		})

		await fireEvent.click(getByRole('button', { name: 'Tool' }))

		const popout = document.body.querySelector('.goo-popout')
		expect(popout?.classList.contains('goo-grid-popout--icon-grid')).toBe(true)
		expect(popout?.classList.contains('goo-grid-popout--one-column')).toBe(false)
	})

	it('clears pending trigger fade work when unmounted', async() => {
		vi.useFakeTimers()
		const cancelAnimationFrameSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
		const { rerender, unmount } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Subtool',
				items,
				selected: 'line'
			}
		})

		await rerender({
			ariaLabel: 'Subtool',
			items,
			selected: 'warp'
		})
		unmount()

		expect(cancelAnimationFrameSpy).toHaveBeenCalled()
	})

	it('removes the document keydown listener as soon as the popout closes', async() => {
		const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
		const { getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Subtool',
				items,
				selected: 'line'
			}
		})
		const trigger = getByRole('button', { name: 'Subtool' })

		await fireEvent.click(trigger)
		await fireEvent.keyDown(document, { key: 'Escape' })

		expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
	})
})
