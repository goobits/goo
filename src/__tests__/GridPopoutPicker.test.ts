import { fireEvent, render, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import GridPopoutPicker from '../grid-popout/GridPopoutPicker.svelte'
import type { GridPopoutItem } from '../grid-popout/types.ts'

vi.mock('@goobits/goo/popout', () => ({
	closePopoutsOutside: vi.fn(),
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
	it('renders the Goo-owned trigger host with the selected option', () => {
		const { container, getByRole } = render(GridPopoutPicker, {
			props: {
				ariaLabel: 'Subtool',
				class: 'goo-grid-trigger--subtool',
				dataParam: 'type',
				id: 'UISubTool',
				items,
				selected: 'line'
			}
		})

		const trigger = getByRole('button', { name: 'Subtool' })

		expect(container.querySelector('goo-grid-popout-trigger')).toBe(trigger)
		expect(trigger.id).toBe('UISubTool')
		expect(trigger.classList.contains('goo-grid-trigger--subtool')).toBe(true)
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
				popoutClass: 'goo-grid-popout--subtool',
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

	it('renders preview images in the trigger and options when provided', async() => {
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

		const trigger = getByRole('button', { name: 'Brush' })
		const triggerPreview = trigger.querySelector('img.icon')

		expect(triggerPreview?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(triggerPreview?.getAttribute('alt')).toBe('Brush preview')

		await fireEvent.click(trigger)

		const optionPreview = getByRole('option', { name: 'Brush' }).querySelector('img.icon')
		expect(optionPreview?.getAttribute('src')).toBe('data:image/png;base64,preview')
		expect(optionPreview?.getAttribute('alt')).toBe('Brush preview')
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
})
