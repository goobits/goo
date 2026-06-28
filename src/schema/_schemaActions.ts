import {
	cloneSchemaData,
	isSchemaDataEqual
} from './_schemaData.ts'
import type {
	GooSchemaData,
	GooSchemaPreset,
	GooSchemaState
} from './types.ts'

type SchemaActionsElement = HTMLElement & {
	_data: GooSchemaData
	_onpreset: ((preset: GooSchemaPreset) => void) | null
	_onreset: ((data: GooSchemaData) => void) | null
	_toolbar: HTMLElement | null
	state: Pick<GooSchemaState, 'activePresetId' | 'defaults' | 'presets' | 'showReset'>
	setData(data: GooSchemaData): void
}

export function appendSchemaActions(element: SchemaActionsElement, parent: HTMLElement): void {
	if (!shouldRenderSchemaActions(element)) return

	const toolbar = document.createElement('div')
	toolbar.className = 'goo-schema__actions'

	const presets = element.state.presets ?? []
	if (presets.length) {
		const select = document.createElement('select')
		select.className = 'goo-schema__preset-select'
		select.ariaLabel = 'Schema preset'

		for (const preset of presets) {
			const option = document.createElement('option')
			option.value = preset.id
			option.textContent = preset.label
			option.selected = preset.id === element.state.activePresetId
			select.appendChild(option)
		}

		select.addEventListener('change', () => {
			const preset = presets.find(candidate => candidate.id === select.value)
			if (!preset) return
			applySchemaPreset(element, preset)
		})
		toolbar.appendChild(select)
	}

	if (element.state.showReset && element.state.defaults) {
		const reset = document.createElement('button')
		reset.className = 'goo-schema__reset'
		reset.type = 'button'
		reset.textContent = 'Reset'
		reset.title = 'Reset to defaults'
		reset.addEventListener('click', () => resetSchemaToDefaults(element))
		toolbar.appendChild(reset)
	}

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(toolbar)
	} else {
		parent.appendChild(toolbar)
	}
	element._toolbar = toolbar
	updateSchemaActionState(element)
}

export function updateSchemaActionState(element: SchemaActionsElement): void {
	const toolbar = element._toolbar
	if (!toolbar) return

	const reset = toolbar.querySelector<HTMLButtonElement>('.goo-schema__reset')
	if (reset && element.state.defaults) {
		reset.disabled = isSchemaDataEqual(element._data, element.state.defaults)
	}

	const select = toolbar.querySelector<HTMLSelectElement>('.goo-schema__preset-select')
	if (select && element.state.activePresetId !== undefined && select.value !== element.state.activePresetId) {
		select.value = element.state.activePresetId ?? ''
	}
}

function shouldRenderSchemaActions(element: SchemaActionsElement): boolean {
	return Boolean((element.state.presets?.length ?? 0) > 0 || (element.state.showReset && element.state.defaults))
}

function applySchemaPreset(element: SchemaActionsElement, preset: GooSchemaPreset): void {
	const data = cloneSchemaData(preset.data)
	element.setData(data)
	const detail = { id: preset.id, preset, data: element._data }
	element.dispatchEvent(new CustomEvent('preset', { detail, bubbles: true }))
	element._onpreset?.(preset)
}

function resetSchemaToDefaults(element: SchemaActionsElement): void {
	const defaults = element.state.defaults
	if (!defaults) return
	const data = cloneSchemaData(defaults)
	element.setData(data)
	const detail = { data: element._data, defaults }
	element.dispatchEvent(new CustomEvent('reset', { detail, bubbles: true }))
	element._onreset?.(element._data)
}
