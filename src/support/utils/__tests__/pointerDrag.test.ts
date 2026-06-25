import { describe, expect, it, vi } from 'vitest'

import { pointerEvent } from '../../../__tests__/_pointerEvents.ts'
import { createPointerDrag, createPointerTap } from '../pointerDrag.ts'

describe('createPointerDrag', () => {
	it('emits pointer drag lifecycle events with shared drag state', () => {
		const target = document.createElement('div')
		target.setPointerCapture = vi.fn()
		target.releasePointerCapture = vi.fn()
		const events: Array<{ envValue: unknown, state: string, x: number, y: number }> = []

		const handle = createPointerDrag(target, event => {
			if (event.START) event.env.marker = 'dragging'
			events.push({
				envValue: event.env.marker,
				state: event.state,
				x: event.x,
				y: event.y
			})
		})

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId: 7 }))
		target.dispatchEvent(pointerEvent('pointermove', { clientX: 15, clientY: 28, pointerId: 7 }))
		target.dispatchEvent(pointerEvent('pointerup', { clientX: 16, clientY: 30, pointerId: 7 }))

		expect(events).toEqual([
			{ envValue: 'dragging', state: 'start', x: 0, y: 0 },
			{ envValue: 'dragging', state: 'move', x: 5, y: 8 },
			{ envValue: 'dragging', state: 'end', x: 6, y: 10 }
		])
		expect(target.setPointerCapture).toHaveBeenCalledWith(7)
		expect(target.releasePointerCapture).toHaveBeenCalledWith(7)

		handle.detach()
	})

	it('reports element-relative coordinates and nearby elements', () => {
		const target = document.createElement('div')
		const handleElement = document.createElement('button')
		handleElement.className = 'handle'
		const events: Array<{ elementX: number, elementY: number, found: boolean }> = []
		document.body.append(target, handleElement)
		target.getBoundingClientRect = () => rect(10, 20, 100, 80)
		document.elementsFromPoint = vi.fn(() => [ handleElement, target ])

		const handle = createPointerDrag(target, event => {
			events.push({
				elementX: event.elementX,
				elementY: event.elementY,
				found: event.elementFromPoint('.handle') === handleElement
			})
		})

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 25, clientY: 45 }))

		expect(events).toEqual([ { elementX: 15, elementY: 25, found: true } ])

		handle.detach()
		target.remove()
		handleElement.remove()
	})

	it('ignores touch pointers when configured for mouse-only drag', () => {
		const target = document.createElement('div')
		const onDrag = vi.fn()
		const handle = createPointerDrag(target, onDrag, { ignoreTouch: true })

		target.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch' }))
		target.dispatchEvent(pointerEvent('pointermove', { pointerType: 'touch' }))
		target.dispatchEvent(pointerEvent('pointerup', { pointerType: 'touch' }))

		expect(onDrag).not.toHaveBeenCalled()

		handle.detach()
	})

	it('ignores non-primary pointer starts for drags and taps', () => {
		const target = document.createElement('button')
		const onDrag = vi.fn()
		const onTap = vi.fn()
		const dragHandle = createPointerDrag(target, onDrag)
		const tapHandle = createPointerTap(target, onTap)

		target.dispatchEvent(pointerEvent('pointerdown', { button: 2, buttons: 2, pointerId: 10 }))
		target.dispatchEvent(pointerEvent('pointermove', { button: 2, buttons: 2, pointerId: 10, clientX: 12 }))
		target.dispatchEvent(pointerEvent('pointerup', { button: 2, buttons: 0, pointerId: 10, clientX: 12 }))

		expect(onDrag).not.toHaveBeenCalled()
		expect(onTap).not.toHaveBeenCalled()

		dragHandle.detach()
		tapHandle.detach()
	})

	it('detaches all event listeners', () => {
		const target = document.createElement('div')
		const onDrag = vi.fn()
		const handle = createPointerDrag(target, onDrag)

		handle.detach()
		target.dispatchEvent(pointerEvent('pointerdown'))

		expect(onDrag).not.toHaveBeenCalled()
	})

	it('cancels active drags and releases pointer capture on detach', () => {
		const target = document.createElement('div')
		target.setPointerCapture = vi.fn()
		target.releasePointerCapture = vi.fn()
		const states: string[] = []
		const handle = createPointerDrag(target, event => {
			states.push(event.state)
		})

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId: 7 }))
		target.dispatchEvent(pointerEvent('pointermove', { clientX: 15, clientY: 25, pointerId: 7 }))

		handle.detach()
		handle.detach()
		target.dispatchEvent(pointerEvent('pointerup', { clientX: 15, clientY: 25, pointerId: 7 }))

		expect(states).toEqual([ 'start', 'move', 'cancel' ])
		expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7)
	})

	it('ends active drags from document-level pointer release events', () => {
		const target = document.createElement('div')
		target.setPointerCapture = vi.fn()
		target.releasePointerCapture = vi.fn()
		const states: string[] = []
		const handle = createPointerDrag(target, event => {
			states.push(event.state)
		})

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId: 7 }))
		document.dispatchEvent(pointerEvent('pointerup', { clientX: 16, clientY: 30, pointerId: 7 }))
		target.dispatchEvent(pointerEvent('pointermove', { clientX: 24, clientY: 40, pointerId: 7 }))

		expect(states).toEqual([ 'start', 'end' ])
		expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7)

		handle.detach()
	})

	it('cancels active drags when pointer capture is lost unexpectedly', () => {
		const target = document.createElement('div')
		target.setPointerCapture = vi.fn()
		target.releasePointerCapture = vi.fn()
		const states: string[] = []
		const handle = createPointerDrag(target, event => {
			states.push(event.state)
		})

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId: 7 }))
		target.dispatchEvent(pointerEvent('lostpointercapture', { clientX: 12, clientY: 22, pointerId: 7 }))
		target.dispatchEvent(pointerEvent('pointermove', { clientX: 24, clientY: 40, pointerId: 7 }))

		expect(states).toEqual([ 'start', 'cancel' ])
		expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7)

		handle.detach()
	})

	it('emits pointer taps when movement stays below the threshold', () => {
		const target = document.createElement('button')
		const onTap = vi.fn()
		const handle = createPointerTap(target, onTap)

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 1, clientY: 1 }))
		target.dispatchEvent(pointerEvent('pointerup', { clientX: 4, clientY: 4 }))

		expect(onTap).toHaveBeenCalledWith(expect.objectContaining({
			clientX: 4,
			clientY: 4,
			target
		}))

		handle.detach()
	})

	it('does not emit pointer taps after drag movement', () => {
		const target = document.createElement('button')
		const onTap = vi.fn()
		const handle = createPointerTap(target, onTap, { threshold: 2 })

		target.dispatchEvent(pointerEvent('pointerdown', { clientX: 1, clientY: 1 }))
		target.dispatchEvent(pointerEvent('pointerup', { clientX: 10, clientY: 10 }))

		expect(onTap).not.toHaveBeenCalled()

		handle.detach()
	})
})

function rect(x: number, y: number, width: number, height: number): DOMRect {
	return {
		bottom: y + height,
		height,
		left: x,
		right: x + width,
		toJSON: () => ({}),
		top: y,
		width,
		x,
		y
	} as DOMRect
}
