import { iconRegistry } from '../icon/registry.ts'
import { schemaScopeMatchesDefaults } from './_schemaHistory.ts'
import type {
	GooSchemaActionOptions,
	GooSchemaData,
	GooSchemaFolder,
	GooSchemaPreset,
	GooSchemaState
} from './types.ts'

export type SchemaActionView = {
	resetButton?: HTMLButtonElement
	scopeId: string
	undoButton?: HTMLButtonElement
}

export type SchemaActionsElement = HTMLElement & {
	_actionViews: Map<string, SchemaActionView>
	_applyHistory(scopeId: string, direction: 'redo' | 'undo'): void
	_applyPreset(preset: GooSchemaPreset): void
	_resetScope(scopeId: string): void
	_data: GooSchemaData
	_history: {
		canRedo(scopeId: string): boolean
		canUndo(scopeId: string): boolean
		getScopePaths(scopeId: string): readonly string[] | undefined
	}
	_redoMode: boolean
	_toolbar: HTMLElement | null
	state: Pick<
		GooSchemaState,
		'actions' | 'activePresetId' | 'defaults' | 'folderActions' | 'presets' | 'showReset'
	>
}

/** Append the root schema preset/history/reset actions. */
export function appendSchemaActions(
	element: SchemaActionsElement,
	parent: HTMLElement
): void {
	const actions = resolveRootActions(element.state)
	if (!shouldRenderSchemaActions(element, actions)) return

	const toolbar = document.createElement('div')
	toolbar.className = 'goo-schema__actions'

	appendPresetSelect(element, toolbar)
	const actionGroup = createSchemaScopeActions(element, 'schema', actions)
	if (actionGroup) toolbar.appendChild(actionGroup)

	const parentContainer = parent as HTMLElement & { add?: (el: HTMLElement) => void }
	if (typeof parentContainer.add === 'function') {
		parentContainer.add(toolbar)
	} else {
		parent.appendChild(toolbar)
	}
	element._toolbar = toolbar
	updateSchemaActionState(element)
}

/** Build the standard action group used by root schemas and folder headers. */
export function createSchemaScopeActions(
	element: SchemaActionsElement,
	scopeId: string,
	actions: GooSchemaActionOptions
): HTMLElement | null {
	const showReset = Boolean(actions.reset && element.state.defaults)
	const showHistory = Boolean(actions.history)
	if (!showReset && !showHistory) return null

	const group = document.createElement('div')
	group.className = 'goo-schema__scope-actions'
	group.dataset.scope = scopeId
	const view: SchemaActionView = { scopeId }

	if (showReset) {
		const reset = createActionButton('reset', 'Reset')
		reset.classList.add('goo-schema__reset')
		reset.addEventListener('click', event => {
			event.stopPropagation()
			element._resetScope(scopeId)
		})
		group.appendChild(reset)
		view.resetButton = reset
	}

	if (showHistory) {
		const undo = createActionButton('undo', 'Undo')
		undo.addEventListener('click', event => {
			event.stopPropagation()
			element._applyHistory(scopeId, element._redoMode ? 'redo' : 'undo')
		})
		group.appendChild(undo)
		view.undoButton = undo
	}

	element._actionViews.set(scopeId, view)
	return group
}

/** Resolve a folder's actions from the host default and node override. */
export function resolveSchemaFolderActions(
	state: Pick<GooSchemaState, 'folderActions'>,
	folder: GooSchemaFolder
): GooSchemaActionOptions {
	if (folder.actions === false) return {}
	return {
		...state.folderActions,
		...folder.actions
	}
}

/** Synchronize action labels and availability with data/history state. */
export function updateSchemaActionState(element: SchemaActionsElement): void {
	const defaults = element.state.defaults
	for (const view of element._actionViews.values()) {
		if (view.resetButton) {
			view.resetButton.disabled = !defaults || schemaScopeMatchesDefaults(
				element._data,
				defaults,
				element._history.getScopePaths(view.scopeId)
			)
		}
		if (view.undoButton) {
			const redo = element._redoMode
			const label = redo ? 'Redo' : 'Undo'
			setActionButtonPresentation(
				view.undoButton,
				redo ? 'redo' : 'undo',
				label
			)
			view.undoButton.disabled = redo
				? !element._history.canRedo(view.scopeId)
				: !element._history.canUndo(view.scopeId)
		}
	}

	const select = element._toolbar?.querySelector<HTMLSelectElement>(
		'.goo-schema__preset-select'
	)
	if (
		select
		&& element.state.activePresetId !== undefined
		&& select.value !== element.state.activePresetId
	) {
		select.value = element.state.activePresetId ?? ''
	}
}

function appendPresetSelect(
	element: SchemaActionsElement,
	toolbar: HTMLElement
): void {
	const presets = element.state.presets ?? []
	if (!presets.length) return

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
		element._applyPreset(preset)
	})
	toolbar.appendChild(select)
}

function shouldRenderSchemaActions(
	element: SchemaActionsElement,
	actions: GooSchemaActionOptions
): boolean {
	return Boolean(
		(element.state.presets?.length ?? 0) > 0
		|| actions.history
		|| (actions.reset && element.state.defaults)
	)
}

function resolveRootActions(
	state: Pick<GooSchemaState, 'actions' | 'showReset'>
): GooSchemaActionOptions {
	return {
		...state.actions,
		reset: state.actions?.reset ?? state.showReset
	}
}

function createActionButton(actionName: string, label: string): HTMLButtonElement {
	const button = document.createElement('button')
	button.className = 'goo-schema__action'
	button.type = 'button'
	setActionButtonPresentation(button, actionName, label)
	return button
}

function setActionButtonPresentation(
	button: HTMLButtonElement,
	actionName: string,
	label: string
): void {
	const icon = iconRegistry.get(actionName)
	button.dataset.action = actionName
	button.title = label
	button.setAttribute('aria-label', label)
	button.classList.toggle('goo-schema__action--icon', Boolean(icon))
	if (icon) {
		button.innerHTML = icon
	} else {
		button.textContent = label
	}
}
