/**
 * @fileoverview Keyboard navigation handler for GooSelect.
 * Handles arrow keys, enter/space, escape, tab, and typeahead.
 * @module goobits/select/keyboardHandler
 */

import type { GooSelectOption, GooSelectState } from './types.ts'

/** Keyboard command event used by GooSelect navigation. */
export interface GooSelectKeyCommand {
	command: string
	cancel: () => void
}

type KeyboardHandlerHost = GooSelectKeyboardHost

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

const KEY_TO_COMMAND: Record<string, string> = {
	ArrowDown: 'down',
	ArrowUp: 'up',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	Enter: 'enter',
	' ': 'space',
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
	const command = KEY_TO_COMMAND[e.key]
	if (!command) return null

	return {
		command,
		cancel: () => e.preventDefault()
	}
}

/**
 * Handle keyboard navigation for GooSelect.
 * @param host - The select component
 * @param event - Keyboard command event
 */
export function handleKeyboard(host: KeyboardHandlerHost, event: GooSelectKeyCommand): void {
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
 * @param event - Keyboard command event
 */
export function handleTypeahead(host: KeyboardHandlerHost, event: GooSelectKeyCommand): void {
	if (!host._opened || host.state.disabled || !host._panel) return

	const { command } = event

	// Skip modifier combos and navigation keys
	if (command.includes('+') || command.length > 1) return

	// Single character - delegate to panel
	host._panel.handleTypeahead(command)
}
