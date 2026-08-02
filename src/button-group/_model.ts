import type { ButtonGroupOption, ButtonGroupOptions, NormalizedButtonGroupOption } from './types.ts'

export function normalizeButtonGroupOptions(options: ButtonGroupOptions = []): NormalizedButtonGroupOption[] {
	if (Array.isArray(options)) {
		return options.map(option => {
			if (typeof option === 'string') {
				return { id: option, label: option }
			}
			return normalizeButtonGroupOption(option)
		})
	}

	return Object.entries(options).map(([ key, option ]) => {
		if (typeof option === 'string') {
			return { id: key, label: option }
		}
		return normalizeButtonGroupOption({ id: key, ...option })
	})
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

function normalizeButtonGroupOption(option: ButtonGroupOption): NormalizedButtonGroupOption {
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
