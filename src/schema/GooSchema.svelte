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

function getCreateKey(): string {
	return JSON.stringify({ className, style })
}

function handleChange(event: Event): void {
	onchange?.(event as GooSchemaEvent)
}

function handleInput(event: Event): void {
	oninput?.(event as GooSchemaEvent)
}

function destroySchema(): void {
	schemaElement?.removeEventListener('change', handleChange)
	schemaElement?.removeEventListener('input', handleInput)
	schemaElement?.destroy()
	schemaElement = null
	instance = null
}

function mountSchema(): void {
	const target = host
	if (!target) return
	destroySchema()
	const nextSchemaElement = createGooSchema({
		schema,
		data,
		bare,
		showPanelHeader,
		folderClassName,
		controlTypes
	})
	schemaElement = nextSchemaElement
	if (className) schemaElement.classList.add(...className.split(' ').filter(Boolean))
	if (style) schemaElement.setAttribute('style', style)
	schemaElement.addEventListener('change', handleChange)
	schemaElement.addEventListener('input', handleInput)
	target.replaceChildren(schemaElement)
	instance = schemaElement
	lastSchema = schema
	lastData = data
	lastBare = bare
	lastShowPanelHeader = showPanelHeader
	lastFolderClassName = folderClassName
	lastControlTypes = controlTypes
}

function updateSchema(): void {
	if (!schemaElement) return
	const options: GooSchemaUpdateOptions = {}
	if (schema !== lastSchema) {
		schemaElement.setSchema(schema)
		lastSchema = schema
	}
	if (data !== lastData) {
		schemaElement.setData(data)
		lastData = data
	}
	if (bare !== lastBare) {
		lastBare = bare
		options.bare = bare
	}
	if (showPanelHeader !== lastShowPanelHeader) {
		lastShowPanelHeader = showPanelHeader
		options.showPanelHeader = showPanelHeader
	}
	if (folderClassName !== lastFolderClassName) {
		lastFolderClassName = folderClassName
		options.folderClassName = folderClassName
	}
	if (controlTypes !== lastControlTypes) {
		lastControlTypes = controlTypes
		options.controlTypes = controlTypes
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
	untrack(() => {
		lastCreateKey = getCreateKey()
		mountSchema()
	})
	mounted = true
	return () => {
		mounted = false
		destroySchema()
	}
})

$effect(() => {
	if (!mounted) return
	const createKey = getCreateKey()
	if (createKey !== lastCreateKey) {
		lastCreateKey = createKey
		mountSchema()
		return
	}
	updateSchema()
})
</script>

<div bind:this={host} style="display: contents"></div>
