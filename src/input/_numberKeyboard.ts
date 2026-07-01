export type GooNumberStepDirection = 'down' | 'up'

export type GooNumberKeyboardAction =
	| { type: 'blur' }
	| { type: 'commit' }
	| { type: 'set-bound'; bound: 'max' | 'min' }
	| { type: 'step'; direction: GooNumberStepDirection; multiplier: number }

export type GooNumberKeyboardBounds = {
	hasMaximum: boolean
	hasMinimum: boolean
}

export function readNumberKeyboardAction(
	event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
	bounds: GooNumberKeyboardBounds
): GooNumberKeyboardAction | null {
	switch (event.key) {
		case 'Enter':
			return { type: 'commit' }
		case 'Escape':
			return { type: 'blur' }
		case 'ArrowUp':
			return { type: 'step', direction: 'up', multiplier: event.shiftKey ? 10 : 1 }
		case 'ArrowDown':
			return { type: 'step', direction: 'down', multiplier: event.shiftKey ? 10 : 1 }
		case 'PageUp':
			return { type: 'step', direction: 'up', multiplier: 10 }
		case 'PageDown':
			return { type: 'step', direction: 'down', multiplier: 10 }
		case 'Home':
			return bounds.hasMinimum ? { type: 'set-bound', bound: 'min' } : null
		case 'End':
			return bounds.hasMaximum ? { type: 'set-bound', bound: 'max' } : null
		default:
			return null
	}
}
