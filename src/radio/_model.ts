import type { GooRadioOption, GooRadioOptions } from './types.js'

type RawRadioOption = string | {
	id?: string | number
	label?: string | number
	value?: string | number
}

export function normalizeRadioOptions(options: GooRadioOptions = []): GooRadioOption[] {
	if (!Array.isArray(options)) {
		return Object.entries(options).map(([ value, label ]) => ({
			value: String(value),
			label: String(label)
		}))
	}

	return options.map(normalizeRadioOption)
}

function normalizeRadioOption(option: RawRadioOption): GooRadioOption {
	if (typeof option === 'string') {
		return { value: option, label: option }
	}

	const label = option.label ?? option.id ?? option.value ?? ''
	const value = option.value ?? option.id ?? label
	return {
		value: String(value),
		label: String(label)
	}
}
