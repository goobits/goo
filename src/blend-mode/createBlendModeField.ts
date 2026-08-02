import './GooBlendMode.css'

import { createSelectField, type SelectFieldOptions } from '../select/_createSelectField.ts'
import type { GooSelectElement, GooSelectOptionsInput } from '../select/types.ts'

export type BlendModeFieldOptions = Omit<SelectFieldOptions, 'options'> & {
	modes?: readonly string[]
}

const DEFAULT_MODES = [ 'normal', 'multiply', 'screen', 'overlay' ] as const

/** Creates a compact blend-mode select field for Goo schema/controller use. */
export function createBlendModeField(options: BlendModeFieldOptions = {}): GooSelectElement {
	const { modes = DEFAULT_MODES, ...selectOptions } = options
	const className = [ 'goo-blend-mode-picker', selectOptions.className ].filter(Boolean).join(' ')
	return createSelectField({
		...selectOptions,
		className,
		menu: {
			placement: 'bottom-end',
			width: 'trigger',
			...selectOptions.menu
		},
		options: normalizeBlendModeOptions(modes),
		placeholder: selectOptions.placeholder ?? 'Blend'
	})
}

function normalizeBlendModeOptions(modes: readonly string[]): GooSelectOptionsInput {
	return modes.map(mode => ({ id: mode, label: toTitleCase(mode) }))
}

function toTitleCase(value: string): string {
	return value
		.split('-')
		.map(part => part ? part[0]!.toUpperCase() + part.slice(1) : part)
		.join(' ')
}
