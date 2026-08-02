import type { GooChoiceOption } from '../support/types/choiceOption.ts'
import type { GooRadioOptions } from './types.ts'

export function normalizeRadioOptions(options: GooRadioOptions = []): GooChoiceOption[] {
	const normalizedOptions = Array.isArray(options)
		? options.map((option, index) => normalizeRadioOption(option, `at index ${ index }`))
		: Object.entries(options).map(([ id, label ]) => normalizeRadioOption(
			{ id, label },
			`for key "${ id }"`
		))

	assertUniqueRadioOptionIds(normalizedOptions)
	return normalizedOptions
}

function normalizeRadioOption(
	option: string | GooChoiceOption,
	location: string
): GooChoiceOption {
	if (typeof option === 'string') {
		if (option.trim() === '') {
			throw new TypeError(`GooRadioGroup option ${ location } must define a non-empty string id.`)
		}
		return { id: option, label: option }
	}

	if (typeof option.id !== 'string' || option.id.trim() === '') {
		throw new TypeError(`GooRadioGroup option ${ location } must define a non-empty string id.`)
	}
	if (typeof option.label !== 'string') {
		throw new TypeError(`GooRadioGroup option ${ location } must define a string label.`)
	}

	return {
		id: option.id,
		label: option.label
	}
}

function assertUniqueRadioOptionIds(options: GooChoiceOption[]): void {
	const firstIndexById = new Map<string, number>()
	for (const [ index, option ] of options.entries()) {
		const firstIndex = firstIndexById.get(option.id)
		if (firstIndex !== undefined) {
			throw new TypeError(
				`GooRadioGroup options contain duplicate id "${ option.id }" at indexes ${ firstIndex } and ${ index }.`
			)
		}
		firstIndexById.set(option.id, index)
	}
}
