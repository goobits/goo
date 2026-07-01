/**
 * @fileoverview Keyboard navigation handler for GooSelect.
 * Handles arrow keys, enter/space, escape, tab, and typeahead.
 * @module goobits/select/keyboardHandler
 */

import {
	containKeyboardEvent,
	isKeyboardActivationKey
} from '../support/keyboard/_keyboardActivation.ts'
import type { GooSelectOption, GooSelectState } from './types.ts'

export type GooSelectNavigationCommand =
	| 'down'
	| 'enter'
	| 'escape'
	| 'left'
	| 'right'
	| 'space'
	| 'tab'
	| 'up'

/** Keyboard command event used by GooSelect navigation. */
export interface GooSelectKeyCommand {
	command: GooSelectNavigationCommand
	cancel: () => void
}

export interface GooSelectTypeaheadCommand {
	command: string
	cancel: () => void
}

type GooSelectPanelHost = {
	hoveredId: string | null
	navigate(dir: 1 | -1): void
	getHoveredElement(): HTMLElement | null
	findOptionById(id: string): GooSelectOption | null
	openSubmenu($item: HTMLElement, opt: GooSelectOption): void
	closeSubmenu(): void
	handleTypeahead(char: string): void
}

/** Private host surface required by GooSelect keyboard helpers. */
export type GooSelectKeyboardHost = {
	state: GooSelectState
	_opened: boolean
	_panel: GooSelectPanelHost | null
	_selectOptions: GooSelectOption[]
	$trigger: HTMLElement | null
	open: () => boolean
	close: () => void
	_selectOption: (opt: GooSelectOption) => void
	_getContext: () => unknown
}

// ============================================================================
// Key Mapping
// ============================================================================

const KEY_TO_COMMAND: Record<string, GooSelectNavigationCommand> = {
	ArrowDown: 'down',
	ArrowUp: 'up',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	Escape: 'escape',
	Tab: 'tab'
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Map native KeyboardEvent to a GooSelect navigation command.
 * @param e - Native keyboard event
 * @returns Keyboard command event or null if not mapped
 */
export function mapNativeKeyToCommand(e: KeyboardEvent): GooSelectKeyCommand | null {
	const command = activationCommandForKey(e.key) ?? KEY_TO_COMMAND[e.key]
	if (!command) return null

	return {
		command,
		cancel: () => containKeyboardEvent(e)
	}
}

export function mapNativeTypeaheadKeyToCommand(e: KeyboardEvent): GooSelectTypeaheadCommand | null {
	if (e.altKey || e.ctrlKey || e.metaKey) return null
	if (e.key.length !== 1) return null
	if (e.key.trim() === '') return null

	return {
		command: e.key,
		cancel: () => containKeyboardEvent(e)
	}
}

/**
 * Handle keyboard navigation for GooSelect.
 * @param host - The select component
 * @param event - Keyboard command event
 */
export function handleKeyboard(host: GooSelectKeyboardHost, event: GooSelectKeyCommand): void {
	if (host.state.disabled) return

	const { command } = event

	// Open on arrow down/space/enter when closed
	if (!host._opened) {
		if (command === 'down' || command === 'space' || command === 'enter') {
			event.cancel()
			host.open()
		}
		return
	}

	if (!host._panel) return

	switch (command) {
		case 'down':
			event.cancel()
			host._panel.navigate(1)
			break

		case 'up':
			event.cancel()
			host._panel.navigate(-1)
			break

		case 'right': {
			event.cancel()
			const $hovered = host._panel.getHoveredElement()
			if ($hovered && host._panel.hoveredId) {
				const opt = host._panel.findOptionById(host._panel.hoveredId!)
				if (opt?.type === 'submenu') host._panel.openSubmenu($hovered, opt)
			}
			break
		}

		case 'left':
			event.cancel()
			host._panel.closeSubmenu()
			break

		case 'enter':
		case 'space':
			event.cancel()
			if (host._panel.hoveredId) {
				const opt = host._panel.findOptionById(host._panel.hoveredId)
				if (opt && opt.type !== 'submenu') {
					host._selectOption(opt)
				} else if (opt?.type === 'submenu') {
					const $hovered = host._panel.getHoveredElement()
					if ($hovered) host._panel.openSubmenu($hovered, opt)
				}
			}
			break

		case 'escape':
			event.cancel()
			host.close()
			host.$trigger?.focus()
			break

		case 'tab':
			host.close()
			break
	}
}

/**
 * Handle typeahead keystrokes for GooSelect.
 * Filters to only single printable characters.
 * @param host - The select component
 * @param event - Typeahead command event
 */
export function handleTypeahead(host: GooSelectKeyboardHost, event: GooSelectTypeaheadCommand): void {
	if (!host._opened || host.state.disabled || !host._panel) return

	event.cancel()
	host._panel.handleTypeahead(event.command)
}

function activationCommandForKey(key: string): GooSelectNavigationCommand | null {
	if (key === 'Enter') return 'enter'
	if (isKeyboardActivationKey(key)) return 'space'
	return null
}
