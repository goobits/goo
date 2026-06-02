import './GooBlendMode.css'

import { createSelectField, type SelectFieldOptions } from '../select/_createSelectField.ts'
import type { GooSelectElement, GooSelectOption } from '../select/types.ts'

export type BlendModeFieldOption = string | {
	id?: string | number
	key?: string | number
	label?: string | number
	value?: string | number
	icon?: string | HTMLElement | (() => string | HTMLElement)
}

export type BlendModeFieldOptions = Omit<SelectFieldOptions, 'options'> & {
	modes?: readonly string[]
	options?: readonly BlendModeFieldOption[] | readonly GooSelectOption[] | Record<string, unknown>
}

const DEFAULT_MODES = [ 'normal', 'multiply', 'screen', 'overlay' ] as const

/** Creates a compact blend-mode select field for Goo schema/controller use. */
export function createBlendModeField(options: BlendModeFieldOptions = {}): GooSelectElement {
	return createSelectField({
		...options,
		className: [ 'goo-blend-mode-picker', options.className ?? options.class ].filter(Boolean).join(' '),
		menu: {
			placement: 'bottom-end',
			width: 'trigger',
			...options.menu
		},
		options: normalizeBlendModeOptions(options.options ?? options.modes ?? DEFAULT_MODES),
		placeholder: options.placeholder ?? 'Blend'
	})
}

function normalizeBlendModeOptions(
	options: BlendModeFieldOptions['options'] | readonly string[]
): readonly GooSelectOption[] | Record<string, unknown> {
	if (!Array.isArray(options)) return options ?? []
	return options.map(option => {
		if (typeof option === 'string') {
			return { id: option, label: toTitleCase(option) }
		}
		const id = option.id ?? option.key ?? option.value ?? option.label ?? ''
		const label = option.label ?? option.value ?? option.id ?? option.key ?? ''
		return {
			id: String(id),
			label: String(label),
			icon: option.icon
		}
	})
}

function toTitleCase(value: string): string {
	return value
		.split('-')
		.map(part => part ? part[0]!.toUpperCase() + part.slice(1) : part)
		.join(' ')
}
