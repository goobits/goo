import type { ButtonGroupOptions, NormalizedButtonGroupOption } from './types.ts'

type RawButtonGroupOption = {
	className?: string
	disabled?: boolean
	icon?: string | (() => Element)
	id?: string | number
	key?: string | number
	label?: string | number
	tooltip?: string
	ariaLabel?: string
	hideLabel?: boolean
	value?: string | number
}

export function normalizeButtonGroupOptions(options: ButtonGroupOptions = []): NormalizedButtonGroupOption[] {
	if (Array.isArray(options)) {
		return options.map(option => {
			if (typeof option === 'string') {
				return { key: option, value: option }
			}
			return normalizeButtonGroupOption(option)
		})
	}

	return Object.entries(options).map(([ key, option ]) => {
		if (typeof option === 'string') {
			return { key, value: option }
		}
		return normalizeButtonGroupOption({ key, ...option })
	})
}

export function normalizeButtonGroupValue(value?: string | string[] | null): Set<string> {
	if (value === undefined || value === null || value === '') return new Set()
	if (Array.isArray(value)) return new Set(value.map(String))
	return new Set([ String(value) ])
}

export function readButtonGroupValue(selectedKeys: Set<string>, allowMultiple: boolean): string | string[] | null {
	if (allowMultiple) {
		return [ ...selectedKeys ]
	}
	return selectedKeys.size > 0 ? [ ...selectedKeys ][0] : null
}

function normalizeButtonGroupOption(option: RawButtonGroupOption): NormalizedButtonGroupOption {
	const label = option.value ?? option.label ?? option.id ?? option.key ?? ''
	const key = option.key ?? option.id ?? option.value ?? label
	return {
		key: String(key),
		value: String(label),
		icon: option.icon,
		tooltip: option.tooltip,
		ariaLabel: option.ariaLabel,
		hideLabel: option.hideLabel,
		className: option.className,
		disabled: option.disabled
	}
}
