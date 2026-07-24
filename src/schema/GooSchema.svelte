<script lang="ts">
	import { untrack } from 'svelte'
	import {
		createGooSchema,
		type GooSchema,
		type GooSchemaChangeHandler,
		type GooSchemaCommitEvent,
		type GooSchemaCommitHandler,
		type GooSchemaCommitOptions,
		type GooSchemaData,
		type GooSchemaDataUpdateOptions,
		type GooSchemaEvent,
		type GooSchemaOptions,
		type GooSchemaPresetEvent,
		type GooSchemaResetEvent,
		type GooSchemaUpdateOptions,
		type GooSchemaType
	} from './GooSchema.ts'

	type GooSchemaDomEventHandler = (event: GooSchemaEvent) => void
	type GooSchemaCommitDomEventHandler = (event: GooSchemaCommitEvent) => void
	type GooSchemaPresetDomEventHandler = (event: GooSchemaPresetEvent) => void
	type GooSchemaResetDomEventHandler = (event: GooSchemaResetEvent) => void

	type GooSchemaProps = Omit<
		GooSchemaOptions,
		'onchange' | 'oncommit' | 'onpreset' | 'onreset'
	> & {
		schema: GooSchemaType
		data: GooSchemaData
		class?: string
		style?: string
		instance?: GooSchema | null
		onchange?: GooSchemaDomEventHandler
		oncommit?: GooSchemaCommitDomEventHandler
		oninput?: GooSchemaDomEventHandler
		onpreset?: GooSchemaPresetDomEventHandler
		onreset?: GooSchemaResetDomEventHandler
		valuechange?: GooSchemaChangeHandler
		valuecommit?: GooSchemaCommitHandler
	}

	let host: HTMLDivElement | null = $state(null)
	let schemaElement: GooSchema | null = null
	let mounted = false
	let lastCreateKey = ''
	let lastSchema: GooSchemaType | undefined
	let lastSchemaKey: string | null = null
	let lastDataKey = ''
	let lastDefaults: GooSchemaData | undefined
	let lastDefaultsKey: string | null = null
	let lastPresets: GooSchemaOptions['presets'] | undefined
	let lastActions: GooSchemaOptions['actions'] | undefined
	let lastActivePresetId: string | null | undefined
	let lastFolderActions: GooSchemaOptions['folderActions'] | undefined
	let lastNormalizeCommit: GooSchemaOptions['normalizeCommit'] | undefined
	let lastShowReset: boolean | undefined
	let lastBare: boolean | undefined
	let lastShowPanelHeader: boolean | undefined
	let lastFolderClassName: string | undefined
	let lastControlTypes: GooSchemaOptions['controlTypes'] | undefined

	type GooSchemaPropsSnapshot = {
		actions: GooSchemaOptions['actions'] | undefined
		bare: boolean
		className: string
		controlTypes: GooSchemaOptions['controlTypes'] | undefined
		data: GooSchemaData
		defaults: GooSchemaData | undefined
		folderClassName: string | undefined
		folderActions: GooSchemaOptions['folderActions'] | undefined
		normalizeCommit: GooSchemaOptions['normalizeCommit'] | undefined
		presets: GooSchemaOptions['presets'] | undefined
		activePresetId: string | null | undefined
		schema: GooSchemaType
		showPanelHeader: boolean
		showReset: boolean | undefined
		style: string | undefined
		valuechange: GooSchemaChangeHandler | undefined
		valuecommit: GooSchemaCommitHandler | undefined
	}

	let {
		schema,
		data,
		defaults,
		presets,
		activePresetId,
		actions,
		showReset,
		bare = false,
		showPanelHeader = true,
		folderClassName,
		folderActions,
		normalizeCommit,
		controlTypes,
		class: className = '',
		style,
		instance = $bindable<GooSchema | null>(null),
		onchange,
		oncommit,
		oninput,
		onpreset,
		onreset,
		valuechange,
		valuecommit
	}: GooSchemaProps = $props()

	function snapshotProps(): GooSchemaPropsSnapshot {
		return {
			actions,
			bare,
			className,
			controlTypes,
			data,
			defaults,
			folderClassName,
			folderActions,
			normalizeCommit,
			presets,
			activePresetId,
			schema,
			showPanelHeader,
			showReset,
			style,
			valuechange,
			valuecommit
		}
	}

	function getCreateKey(snapshot: GooSchemaPropsSnapshot): string {
		return JSON.stringify({ className: snapshot.className, style: snapshot.style })
	}

	function getDataKey(nextData: GooSchemaData): string {
		try {
			return JSON.stringify(nextData)
		} catch {
			return ''
		}
	}

	function getStructuralKey(value: unknown): string | null {
		let serializable = true
		try {
			const key = JSON.stringify(value, (_key, item: unknown) => {
				if (
					typeof item === 'bigint'
					|| typeof item === 'function'
					|| typeof item === 'symbol'
				) {
					serializable = false
				}
				return item
			})
			return serializable && key !== undefined ? key : null
		} catch {
			return null
		}
	}

	function hasStructuralChange(
		next: unknown,
		previous: unknown,
		nextKey: string | null,
		previousKey: string | null
	): boolean {
		return nextKey !== null && previousKey !== null
			? nextKey !== previousKey
			: next !== previous
	}

	function handleChange(event: Event): void {
		if (!isSchemaEvent(event)) return
		onchange?.(event as GooSchemaEvent)
	}

	function handleInput(event: Event): void {
		if (!isSchemaEvent(event)) return
		oninput?.(event as GooSchemaEvent)
	}

	function handleCommit(event: Event): void {
		if (!isSchemaCommitEvent(event)) return
		oncommit?.(event)
	}

	function handlePreset(event: Event): void {
		if (!isSchemaPresetEvent(event)) return
		onpreset?.(event)
	}

	function handleReset(event: Event): void {
		if (!isSchemaResetEvent(event)) return
		onreset?.(event)
	}

	function isSchemaEvent(event: Event): event is GooSchemaEvent {
		return (
			event.target === schemaElement &&
			event instanceof CustomEvent &&
			typeof event.detail?.path === 'string'
		)
	}

	function isSchemaCommitEvent(event: Event): event is GooSchemaCommitEvent {
		return (
			event.target === schemaElement &&
			event instanceof CustomEvent &&
			Array.isArray(event.detail?.paths) &&
			typeof event.detail?.reason === 'string'
		)
	}

	function isSchemaPresetEvent(event: Event): event is GooSchemaPresetEvent {
		return (
			event.target === schemaElement &&
			event instanceof CustomEvent &&
			typeof event.detail?.id === 'string'
		)
	}

	function isSchemaResetEvent(event: Event): event is GooSchemaResetEvent {
		return (
			event.target === schemaElement &&
			event instanceof CustomEvent &&
			event.detail?.data !== undefined &&
			event.detail?.defaults !== undefined
		)
	}

	function destroySchema(): void {
		schemaElement?.removeEventListener('change', handleChange)
		schemaElement?.removeEventListener('commit', handleCommit)
		schemaElement?.removeEventListener('input', handleInput)
		schemaElement?.removeEventListener('preset', handlePreset)
		schemaElement?.removeEventListener('reset', handleReset)
		schemaElement?.destroy()
		schemaElement = null
		instance = null
	}

	function mountSchema(snapshot: GooSchemaPropsSnapshot): void {
		const target = host
		if (!target) return
		destroySchema()
		const nextSchemaElement = createGooSchema({
			actions: snapshot.actions,
			schema: snapshot.schema,
			data: snapshot.data,
			defaults: snapshot.defaults,
			presets: snapshot.presets,
			activePresetId: snapshot.activePresetId,
			showReset: snapshot.showReset,
			bare: snapshot.bare,
			showPanelHeader: snapshot.showPanelHeader,
			folderClassName: snapshot.folderClassName,
			folderActions: snapshot.folderActions,
			normalizeCommit: snapshot.normalizeCommit,
			controlTypes: snapshot.controlTypes,
			onchange: snapshot.valuechange,
			oncommit: snapshot.valuecommit
		})
		schemaElement = nextSchemaElement
		if (snapshot.className)
			schemaElement.classList.add(...snapshot.className.split(' ').filter(Boolean))
		if (snapshot.style) schemaElement.setAttribute('style', snapshot.style)
		schemaElement.addEventListener('change', handleChange)
		schemaElement.addEventListener('commit', handleCommit)
		schemaElement.addEventListener('input', handleInput)
		schemaElement.addEventListener('preset', handlePreset)
		schemaElement.addEventListener('reset', handleReset)
		target.replaceChildren(schemaElement)
		instance = schemaElement
		lastSchema = snapshot.schema
		lastSchemaKey = getStructuralKey(snapshot.schema)
		lastDataKey = getDataKey(snapshot.data)
		lastDefaults = snapshot.defaults
		lastDefaultsKey = getStructuralKey(snapshot.defaults)
		lastPresets = snapshot.presets
		lastActions = snapshot.actions
		lastActivePresetId = snapshot.activePresetId
		lastFolderActions = snapshot.folderActions
		lastNormalizeCommit = snapshot.normalizeCommit
		lastShowReset = snapshot.showReset
		lastBare = snapshot.bare
		lastShowPanelHeader = snapshot.showPanelHeader
		lastFolderClassName = snapshot.folderClassName
		lastControlTypes = snapshot.controlTypes
	}

	function updateSchema(snapshot: GooSchemaPropsSnapshot): void {
		if (!schemaElement) return
		const options: GooSchemaUpdateOptions = {}
		const nextDataKey = getDataKey(snapshot.data)
		const nextSchemaKey = getStructuralKey(snapshot.schema)
		if (hasStructuralChange(snapshot.schema, lastSchema, nextSchemaKey, lastSchemaKey)) {
			schemaElement.setSchema(snapshot.schema)
		}
		lastSchema = snapshot.schema
		lastSchemaKey = nextSchemaKey
		if (nextDataKey !== lastDataKey) {
			if (nextDataKey === getDataKey(schemaElement.getData())) {
				// Controlled hosts commonly echo a schema-owned commit back as
				// a new data object. Refresh that shared value without rebasing
				// the history transaction that produced it.
				schemaElement.refreshConditions()
			} else {
				schemaElement.setData(snapshot.data)
			}
			lastDataKey = nextDataKey
		}
		const nextDefaultsKey = getStructuralKey(snapshot.defaults)
		if (hasStructuralChange(snapshot.defaults, lastDefaults, nextDefaultsKey, lastDefaultsKey)) {
			options.defaults = snapshot.defaults
		}
		lastDefaults = snapshot.defaults
		lastDefaultsKey = nextDefaultsKey
		if (snapshot.presets !== lastPresets) {
			lastPresets = snapshot.presets
			options.presets = snapshot.presets
		}
		if (snapshot.actions !== lastActions) {
			lastActions = snapshot.actions
			options.actions = snapshot.actions
		}
		if (snapshot.activePresetId !== lastActivePresetId) {
			lastActivePresetId = snapshot.activePresetId
			options.activePresetId = snapshot.activePresetId
		}
		if (snapshot.folderActions !== lastFolderActions) {
			lastFolderActions = snapshot.folderActions
			options.folderActions = snapshot.folderActions
		}
		if (snapshot.normalizeCommit !== lastNormalizeCommit) {
			lastNormalizeCommit = snapshot.normalizeCommit
			options.normalizeCommit = snapshot.normalizeCommit
		}
		if (snapshot.showReset !== lastShowReset) {
			lastShowReset = snapshot.showReset
			options.showReset = snapshot.showReset
		}
		if (snapshot.bare !== lastBare) {
			lastBare = snapshot.bare
			options.bare = snapshot.bare
		}
		if (snapshot.showPanelHeader !== lastShowPanelHeader) {
			lastShowPanelHeader = snapshot.showPanelHeader
			options.showPanelHeader = snapshot.showPanelHeader
		}
		if (snapshot.folderClassName !== lastFolderClassName) {
			lastFolderClassName = snapshot.folderClassName
			options.folderClassName = snapshot.folderClassName
		}
		if (snapshot.controlTypes !== lastControlTypes) {
			lastControlTypes = snapshot.controlTypes
			options.controlTypes = snapshot.controlTypes
		}
		if (Object.keys(options).length) {
			schemaElement.setOptions(options)
		}
	}

	export function setData(nextData: GooSchemaData, options?: GooSchemaDataUpdateOptions): void {
		schemaElement?.setData(nextData, options)
	}

	export function commitData(nextData: GooSchemaData, options?: GooSchemaCommitOptions): void {
		schemaElement?.commitData(nextData, options)
	}

	export function undo(scopeId?: string): void {
		schemaElement?.undo(scopeId)
	}

	export function redo(scopeId?: string): void {
		schemaElement?.redo(scopeId)
	}

	export function reset(scopeId?: string): void {
		schemaElement?.reset(scopeId)
	}

	export function setActionsTarget(target: HTMLElement | null): void {
		schemaElement?.setActionsTarget(target)
	}

	export function getData(): GooSchemaData | undefined {
		return schemaElement?.getData()
	}

	export function setSchema(nextSchema: GooSchemaType): void {
		schemaElement?.setSchema(nextSchema)
	}

	export function getSchema(): GooSchemaType | undefined {
		return schemaElement?.getSchema()
	}

	export function getController(path: string): HTMLElement | undefined {
		return schemaElement?.getController(path)
	}

	export function refresh(): void {
		schemaElement?.refresh()
	}

	export function refreshConditions(): void {
		schemaElement?.refreshConditions()
	}

	$effect(() => {
		if (!host) return
		untrack(() => {
			const snapshot = snapshotProps()
			lastCreateKey = getCreateKey(snapshot)
			mountSchema(snapshot)
		})
		mounted = true
		return () => {
			mounted = false
			destroySchema()
		}
	})

	$effect(() => {
		if (!mounted) return
		const snapshot = snapshotProps()
		const createKey = getCreateKey(snapshot)
		if (createKey !== lastCreateKey) {
			lastCreateKey = createKey
			mountSchema(snapshot)
			return
		}
		updateSchema(snapshot)
	})
</script>

<div bind:this={host} style="display: contents"></div>
