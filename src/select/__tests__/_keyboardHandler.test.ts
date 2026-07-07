import { describe, expect, it, vi } from 'vitest'

import {
	type GooSelectKeyboardHost,
	handleKeyboard,
	handleTypeahead,
	mapNativeKeyToCommand,
	mapNativeTypeaheadKeyToCommand
} from '../_keyboardHandler.ts'
import type { GooSelectOption } from '../types.ts'

describe('GooSelect keyboard handler', () => {
	it.each([
		[ 'Enter', 'enter' ],
		[ ' ', 'space' ],
		[ 'Space', 'space' ],
		[ 'Spacebar', 'space' ]
	])('maps activation key %s to %s command', (key, command) => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key
		})

		expect(mapNativeKeyToCommand(event)?.command).toBe(command)
	})

	it.each([
		[ 'ArrowDown', 'down' ],
		[ 'ArrowUp', 'up' ],
		[ 'ArrowLeft', 'left' ],
		[ 'ArrowRight', 'right' ],
		[ 'End', 'last' ],
		[ 'Escape', 'escape' ],
		[ 'Home', 'first' ],
		[ 'Tab', 'tab' ]
	])('maps native key %s to %s command', (key, command) => {
		expect(mapNativeKeyToCommand(new KeyboardEvent('keydown', { key }))?.command).toBe(command)
	})

	it('contains canceled native commands', () => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowDown'
		})

		mapNativeKeyToCommand(event)?.cancel()

		expect(event.defaultPrevented).toBe(true)
		expect(event.cancelBubble).toBe(true)
	})

	it('contains canceled native typeahead commands', () => {
		const event = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'a'
		})
		const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation')

		mapNativeTypeaheadKeyToCommand(event)?.cancel()

		expect(event.defaultPrevented).toBe(true)
		expect(stopImmediatePropagation).toHaveBeenCalledOnce()
	})

	it('ignores modifier chords and whitespace for typeahead', () => {
		expect(mapNativeTypeaheadKeyToCommand(new KeyboardEvent('keydown', {
			ctrlKey: true,
			key: 'a'
		}))).toBeNull()
		expect(mapNativeTypeaheadKeyToCommand(new KeyboardEvent('keydown', {
			key: ' '
		}))).toBeNull()
		expect(mapNativeTypeaheadKeyToCommand(new KeyboardEvent('keydown', {
			key: 'ArrowDown'
		}))).toBeNull()
	})

	it('opens from closed state on arrow down, enter, or space', () => {
		for (const command of [ 'down', 'enter', 'space' ] as const) {
			const { host } = createHost({ opened: false })
			const event = createCommand(command)

			handleKeyboard(host, event)

			expect(event.cancel).toHaveBeenCalledOnce()
			expect(host.open).toHaveBeenCalledOnce()
		}
	})

	it('navigates opened menus with up and down', () => {
		const { host, panel } = createHost()

		handleKeyboard(host, createCommand('down'))
		handleKeyboard(host, createCommand('up'))

		expect(panel.navigate).toHaveBeenNthCalledWith(1, 1)
		expect(panel.navigate).toHaveBeenNthCalledWith(2, -1)
	})

	it('navigates opened menus to first and last options', () => {
		const { host, panel } = createHost()

		handleKeyboard(host, createCommand('first'))
		handleKeyboard(host, createCommand('last'))

		expect(panel.navigateToBoundary).toHaveBeenNthCalledWith(1, 'first')
		expect(panel.navigateToBoundary).toHaveBeenNthCalledWith(2, 'last')
	})

	it('opens and closes submenus with horizontal keys', () => {
		const { host, panel, submenu, submenuElement } = createHost({ hoveredId: 'submenu' })

		handleKeyboard(host, createCommand('right'))
		handleKeyboard(host, createCommand('left'))

		expect(panel.openSubmenu).toHaveBeenCalledExactlyOnceWith(submenuElement, submenu)
		expect(panel.closeSubmenu).toHaveBeenCalledOnce()
	})

	it('selects options and opens submenus from activation keys', () => {
		const optionHost = createHost({ hoveredId: 'option' })
		const submenuHost = createHost({ hoveredId: 'submenu' })

		handleKeyboard(optionHost.host, createCommand('enter'))
		handleKeyboard(submenuHost.host, createCommand('space'))

		expect(optionHost.host._selectOption).toHaveBeenCalledExactlyOnceWith(optionHost.option)
		expect(submenuHost.panel.openSubmenu).toHaveBeenCalledExactlyOnceWith(
			submenuHost.submenuElement,
			submenuHost.submenu
		)
	})

	it('closes and returns focus on escape', () => {
		const { host, trigger } = createHost()
		const focus = vi.spyOn(trigger, 'focus')

		handleKeyboard(host, createCommand('escape'))

		expect(host.close).toHaveBeenCalledOnce()
		expect(focus).toHaveBeenCalledOnce()
	})

	it('closes on tab without containing the native tab event', () => {
		const { host } = createHost()
		const event = createCommand('tab')

		handleKeyboard(host, event)

		expect(host.close).toHaveBeenCalledOnce()
		expect(event.cancel).not.toHaveBeenCalled()
	})

	it('ignores commands while disabled', () => {
		const { host } = createHost({ disabled: true })
		const event = createCommand('down')

		handleKeyboard(host, event)

		expect(event.cancel).not.toHaveBeenCalled()
		expect(host.open).not.toHaveBeenCalled()
	})

	it('delegates typeahead only for open enabled menus', () => {
		const { host, panel } = createHost()
		const event = {
			cancel: vi.fn(),
			command: 'a'
		}

		handleTypeahead(host, event)

		expect(event.cancel).toHaveBeenCalledOnce()
		expect(panel.handleTypeahead).toHaveBeenCalledExactlyOnceWith('a')

		const disabledHost = createHost({ disabled: true }).host
		const disabledEvent = {
			cancel: vi.fn(),
			command: 'b'
		}
		handleTypeahead(disabledHost, disabledEvent)
		expect(disabledEvent.cancel).not.toHaveBeenCalled()
	})
})

function createCommand(command: Parameters<typeof handleKeyboard>[1]['command']): Parameters<typeof handleKeyboard>[1] {
	return {
		cancel: vi.fn(),
		command
	}
}

function createHost({
	disabled = false,
	hoveredId = 'option',
	opened = true
}: {
	disabled?: boolean
	hoveredId?: string
	opened?: boolean
} = {}) {
	const option: GooSelectOption = {
		id: 'option',
		type: 'option'
	}
	const submenu: GooSelectOption = {
		id: 'submenu',
		options: [],
		type: 'submenu'
	}
	const hoveredElement = document.createElement('div')
	const submenuElement = document.createElement('div')
	const trigger = document.createElement('button')
	const panel = {
		closeSubmenu: vi.fn(),
		findOptionById: vi.fn((id: string) => id === 'submenu' ? submenu : option),
		getHoveredElement: vi.fn(() => hoveredId === 'submenu' ? submenuElement : hoveredElement),
		handleTypeahead: vi.fn(),
		hoveredId,
		navigate: vi.fn(),
		navigateToBoundary: vi.fn(),
		openSubmenu: vi.fn()
	}
	const host: GooSelectKeyboardHost = {
		$trigger: trigger,
		_getContext: vi.fn(),
		_opened: opened,
		_panel: panel,
		_selectOption: vi.fn(),
		_selectOptions: [ option, submenu ],
		close: vi.fn(),
		open: vi.fn(() => true),
		state: {
			disabled,
			enableKeyboard: true,
			placeholder: '',
			showHeader: false,
			showSelectionIndicator: false,
			value: ''
		}
	}

	return {
		host,
		option,
		panel,
		submenu,
		submenuElement,
		trigger
	}
}
