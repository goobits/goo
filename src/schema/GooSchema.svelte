<script lang="ts">
	import { untrack } from 'svelte'
	import {
		createGooSchema,
		type GooSchema,
		type GooSchemaChangeHandler,
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
	type GooSchemaPresetDomEventHandler = (event: GooSchemaPresetEvent) => void
	type GooSchemaResetDomEventHandler = (event: GooSchemaResetEvent) => void

	type GooSchemaProps = GooSchemaOptions & {
		schema: GooSchemaType
		data: GooSchemaData
		class?: string
		style?: string
		instance?: GooSchema | null
		onchange?: GooSchemaDomEventHandler
		oninput?: GooSchemaDomEventHandler
		onpreset?: GooSchemaPresetDomEventHandler
		onreset?: GooSchemaResetDomEventHandler
		valuechange?: GooSchemaChangeHandler
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
	let lastActivePresetId: string | null | undefined
	let lastShowReset: boolean | undefined
	let lastBare: boolean | undefined
	let lastShowPanelHeader: boolean | undefined
	let lastFolderClassName: string | undefined
	let lastControlTypes: GooSchemaOptions['controlTypes'] | undefined

	type GooSchemaPropsSnapshot = {
		bare: boolean
		className: string
		controlTypes: GooSchemaOptions['controlTypes'] | undefined
		data: GooSchemaData
		defaults: GooSchemaData | undefined
		folderClassName: string | undefined
		presets: GooSchemaOptions['presets'] | undefined
		activePresetId: string | null | undefined
		schema: GooSchemaType
		showPanelHeader: boolean
		showReset: boolean | undefined
		style: string | undefined
		valuechange: GooSchemaChangeHandler | undefined
	}

	let {
		schema,
		data,
		defaults,
		presets,
		activePresetId,
		showReset,
		bare = false,
		showPanelHeader = true,
		folderClassName,
		controlTypes,
		class: className = '',
		style,
		instance = $bindable<GooSchema | null>(null),
		onchange,
		oninput,
		onpreset,
		onreset,
		valuechange
	}: GooSchemaProps = $props()

	function snapshotProps(): GooSchemaPropsSnapshot {
		return {
			bare,
			className,
			controlTypes,
			data,
			defaults,
			folderClassName,
			presets,
			activePresetId,
			schema,
			showPanelHeader,
			showReset,
			style,
			valuechange
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
			schema: snapshot.schema,
			data: snapshot.data,
			defaults: snapshot.defaults,
			presets: snapshot.presets,
			activePresetId: snapshot.activePresetId,
			showReset: snapshot.showReset,
			bare: snapshot.bare,
			showPanelHeader: snapshot.showPanelHeader,
			folderClassName: snapshot.folderClassName,
			controlTypes: snapshot.controlTypes,
			onchange: snapshot.valuechange
		})
		schemaElement = nextSchemaElement
		if (snapshot.className)
			schemaElement.classList.add(...snapshot.className.split(' ').filter(Boolean))
		if (snapshot.style) schemaElement.setAttribute('style', snapshot.style)
		schemaElement.addEventListener('change', handleChange)
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
		lastActivePresetId = snapshot.activePresetId
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
			schemaElement.setData(snapshot.data)
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
		if (snapshot.activePresetId !== lastActivePresetId) {
			lastActivePresetId = snapshot.activePresetId
			options.activePresetId = snapshot.activePresetId
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
