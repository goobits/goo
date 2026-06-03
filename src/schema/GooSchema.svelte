<script lang="ts">
import { untrack } from 'svelte'
import {
	createGooSchema,
	type GooSchema,
	type GooSchemaOptions,
	type GooSchemaType
} from './GooSchema.ts'

type GooSchemaChangeHandler = (event: CustomEvent<{ path: string; value: unknown; data: Record<string, unknown> }>) => void

type GooSchemaProps = GooSchemaOptions & {
	schema: GooSchemaType
	data: Record<string, unknown>
	class?: string
	style?: string
	instance?: GooSchema | null
	onchange?: GooSchemaChangeHandler
	oninput?: GooSchemaChangeHandler
}

let host: HTMLDivElement | null = $state(null)
let schemaElement: GooSchema | null = null
let mounted = false
let lastCreateKey = ''
let lastSchema: GooSchemaType | undefined
let lastData: Record<string, unknown> | undefined
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
	return JSON.stringify({ bare, className, showPanelHeader, style })
}

function handleChange(event: Event): void {
	onchange?.(event as CustomEvent<{ path: string; value: unknown; data: Record<string, unknown> }>)
}

function handleInput(event: Event): void {
	oninput?.(event as CustomEvent<{ path: string; value: unknown; data: Record<string, unknown> }>)
}

function destroySchema(): void {
	schemaElement?.removeEventListener('change', handleChange)
	schemaElement?.removeEventListener('input', handleInput)
	schemaElement?._destroyElement()
	schemaElement?.remove()
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
	if (schema !== lastSchema) {
		schemaElement.setSchema(schema)
		lastSchema = schema
	}
	if (data !== lastData) {
		schemaElement.setData(data)
		lastData = data
	}
	if (bare !== lastBare) {
		schemaElement.bare = bare
		lastBare = bare
	}
	if (showPanelHeader !== lastShowPanelHeader) {
		schemaElement.showPanelHeader = showPanelHeader
		lastShowPanelHeader = showPanelHeader
	}
	if (folderClassName !== lastFolderClassName) {
		schemaElement.folderClassName = folderClassName
		lastFolderClassName = folderClassName
	}
	if (controlTypes !== lastControlTypes) {
		schemaElement.controlTypes = controlTypes
		lastControlTypes = controlTypes
	}
}

export function setData(nextData: Record<string, unknown>): void {
	schemaElement?.setData(nextData)
}

export function getData(): Record<string, unknown> | undefined {
	return schemaElement?.getData()
}

export function setSchema(nextSchema: GooSchemaType): void {
	schemaElement?.setSchema(nextSchema)
}

export function getSchema(): GooSchemaType | undefined {
	return schemaElement?.getSchema()
}

export function getController(path: string): unknown {
	return schemaElement?.getController(path)
}

export function updateDisplay(): void {
	schemaElement?.updateDisplay()
}

export function reevaluateConditions(): void {
	schemaElement?.reevaluateConditions()
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
