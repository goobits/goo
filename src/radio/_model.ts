import type { GooChoiceOption } from '../support/types/choiceOption.ts'
import type { GooRadioOptions } from './types.ts'

export function normalizeRadioOptions(options: GooRadioOptions = []): GooChoiceOption[] {
	if (!Array.isArray(options)) {
		return Object.entries(options).map(([id, label]) => ({
			id: String(id),
			label: String(label)
		}))
	}

	return options.map(normalizeRadioOption)
}

function normalizeRadioOption(option: string | GooChoiceOption): GooChoiceOption {
	if (typeof option === 'string') {
		return { id: option, label: option }
	}

	return {
		id: String(option.id),
		label: String(option.label)
	}
}
