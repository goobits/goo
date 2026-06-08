<script lang="ts">
import { untrack } from 'svelte'
import {
	createGooSchema,
	type GooSchema,
	type GooSchemaData,
	type GooSchemaEvent,
	type GooSchemaOptions,
	type GooSchemaUpdateOptions,
	type GooSchemaType
} from './GooSchema.ts'

type GooSchemaDomEventHandler = (event: GooSchemaEvent) => void

type GooSchemaProps = GooSchemaOptions & {
	schema: GooSchemaType
	data: GooSchemaData
	class?: string
	style?: string
	instance?: GooSchema | null
	onchange?: GooSchemaDomEventHandler
	oninput?: GooSchemaDomEventHandler
}

let host: HTMLDivElement | null = $state(null)
let schemaElement: GooSchema | null = null
let mounted = false
let lastCreateKey = ''
let lastSchema: GooSchemaType | undefined
let lastData: GooSchemaData | undefined
let lastBare: boolean | undefined
let lastShowPanelHeader: boolean | undefined
let lastFolderClassName: string | undefined
let lastControlTypes: GooSchemaOptions['controlTypes'] | undefined

type GooSchemaPropsSnapshot = {
	bare: boolean
	className: string
	controlTypes: GooSchemaOptions['controlTypes'] | undefined
	data: GooSchemaData
	folderClassName: string | undefined
	schema: GooSchemaType
	showPanelHeader: boolean
	style: string | undefined
}

let {
	schema,
	data,
	bare = false,
	showPanelHeader = true,
	folderClassName,
	controlTypes,
	class: className = '',
	style,
	instance = $bindable<GooSchema | null>(null),
	onchange,
	oninput
}: GooSchemaProps = $props()

function snapshotProps(): GooSchemaPropsSnapshot {
	return {
		bare,
		className,
		controlTypes,
		data,
		folderClassName,
		schema,
		showPanelHeader,
		style
	}
}

function getCreateKey(snapshot: GooSchemaPropsSnapshot): string {
	return JSON.stringify({ className: snapshot.className, style: snapshot.style })
}

function handleChange(event: Event): void {
	if (!isSchemaEvent(event)) return
	onchange?.(event as GooSchemaEvent)
}

function handleInput(event: Event): void {
	if (!isSchemaEvent(event)) return
	oninput?.(event as GooSchemaEvent)
}

function isSchemaEvent(event: Event): event is GooSchemaEvent {
	return event.target === schemaElement
		&& event instanceof CustomEvent
		&& typeof event.detail?.path === 'string'
}

function destroySchema(): void {
	schemaElement?.removeEventListener('change', handleChange)
	schemaElement?.removeEventListener('input', handleInput)
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
		bare: snapshot.bare,
		showPanelHeader: snapshot.showPanelHeader,
		folderClassName: snapshot.folderClassName,
		controlTypes: snapshot.controlTypes
	})
	schemaElement = nextSchemaElement
	if (snapshot.className) schemaElement.classList.add(...snapshot.className.split(' ').filter(Boolean))
	if (snapshot.style) schemaElement.setAttribute('style', snapshot.style)
	schemaElement.addEventListener('change', handleChange)
	schemaElement.addEventListener('input', handleInput)
	target.replaceChildren(schemaElement)
	instance = schemaElement
	lastSchema = snapshot.schema
	lastData = snapshot.data
	lastBare = snapshot.bare
	lastShowPanelHeader = snapshot.showPanelHeader
	lastFolderClassName = snapshot.folderClassName
	lastControlTypes = snapshot.controlTypes
}

function updateSchema(snapshot: GooSchemaPropsSnapshot): void {
	if (!schemaElement) return
	const options: GooSchemaUpdateOptions = {}
	if (snapshot.schema !== lastSchema) {
		schemaElement.setSchema(snapshot.schema)
		lastSchema = snapshot.schema
	}
	if (snapshot.data !== lastData) {
		schemaElement.setData(snapshot.data)
		lastData = snapshot.data
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

export function setData(nextData: GooSchemaData): void {
	schemaElement?.setData(nextData)
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
	const snapshot = snapshotProps()
	untrack(() => {
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
