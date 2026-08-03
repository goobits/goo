import type { ButtonGroupOption, ButtonGroupOptions, NormalizedButtonGroupOption } from './types.ts'

export function normalizeButtonGroupOptions(options: ButtonGroupOptions = []): NormalizedButtonGroupOption[] {
	const normalizedOptions = Array.isArray(options)
		? options.map((option, index) => {
			if (typeof option === 'string') {
				return { id: option, label: option }
			}
			return normalizeButtonGroupOption(option, `at index ${ index }`)
		})
		: Object.entries(options).map(([ key, option ]) => {
			if (typeof option === 'string') {
				return { id: key, label: option }
			}
			return normalizeButtonGroupOption({ ...option, id: key }, `for key "${ key }"`)
		})

	assertUniqueButtonGroupOptionIds(normalizedOptions)
	return normalizedOptions
}

export function normalizeButtonGroupValue(value?: string | string[] | null): Set<string> {
	if (value === undefined || value === null || value === '') return new Set()
	if (Array.isArray(value)) return new Set(value.map(String))
	return new Set([ String(value) ])
}

export function readButtonGroupValue(selectedIds: Set<string>, allowMultiple: boolean): string | string[] | null {
	if (allowMultiple) {
		return [ ...selectedIds ]
	}
	const [ selectedId ] = selectedIds
	return selectedId ?? null
}

function normalizeButtonGroupOption(
	option: ButtonGroupOption,
	location: string
): NormalizedButtonGroupOption {
	if (
		(typeof option.id !== 'string' && typeof option.id !== 'number')
		|| String(option.id).trim() === ''
	) {
		throw new TypeError(`GooButtonGroup option ${ location } must define a non-empty string or number id.`)
	}
	if (typeof option.label !== 'string' && typeof option.label !== 'number') {
		throw new TypeError(`GooButtonGroup option ${ location } must define a string or number label.`)
	}

	const normalizedOption: NormalizedButtonGroupOption = {
		id: String(option.id),
		label: String(option.label)
	}
	if (option.icon !== undefined) normalizedOption.icon = option.icon
	if (option.title !== undefined) normalizedOption.title = option.title
	if (option.ariaLabel !== undefined) normalizedOption.ariaLabel = option.ariaLabel
	if (option.hideLabel !== undefined) normalizedOption.hideLabel = option.hideLabel
	if (option.className !== undefined) normalizedOption.className = option.className
	if (option.disabled !== undefined) normalizedOption.disabled = option.disabled
	return normalizedOption
}

function assertUniqueButtonGroupOptionIds(options: NormalizedButtonGroupOption[]): void {
	const firstIndexById = new Map<string, number>()
	for (const [ index, option ] of options.entries()) {
		const firstIndex = firstIndexById.get(option.id)
		if (firstIndex !== undefined) {
			throw new TypeError(
				`GooButtonGroup options contain duplicate id "${ option.id }" at indexes ${ firstIndex } and ${ index }.`
			)
		}
		firstIndexById.set(option.id, index)
	}
}
