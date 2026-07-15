import { shouldRenderSchemaNode } from './fieldConditions.ts'
import type {
	GooSchemaData,
	GooSchemaNode,
	GooSchemaType
} from './types.ts'

type SchemaVisibilityElement = {
	_data: GooSchemaData
	state: {
		schema: GooSchemaType
	}
}

export function mergeSchemaData(target: GooSchemaData, source: GooSchemaData): void {
	if (target === source) return
	for (const key of Object.keys(target)) {
		if (!(key in source)) {
			delete target[key]
		}
	}
	for (const [ key, value ] of Object.entries(source)) {
		const current = target[key]
		if (isPlainRecord(current) && isPlainRecord(value)) {
			mergeSchemaData(current, value)
		} else {
			target[key] = value
		}
	}
}

export function schemaHasConditions(schema: GooSchemaType): boolean {
	const nodes = Array.isArray(schema) ? schema : schema.children
	return nodes.some(nodeHasConditions)
}

export function getSchemaVisibilitySignature(element: SchemaVisibilityElement): string {
	const schema = element.state.schema
	const nodes = Array.isArray(schema) ? schema : schema.children
	return nodes.map(node => getNodeVisibilitySignature(node, element._data)).filter(Boolean).join('|')
}

export function cloneSchemaData(data: GooSchemaData): GooSchemaData {
	return cloneSchemaValue(data) as GooSchemaData
}

export function cloneSchemaValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(cloneSchemaValue)
	if (isPlainRecord(value)) {
		return Object.fromEntries(Object.entries(value).map(([ key, child ]) => [ key, cloneSchemaValue(child) ]))
	}
	return value
}

export function isSchemaDataEqual(left: GooSchemaData, right: GooSchemaData): boolean {
	return isSchemaValueEqual(left, right)
}

function isPlainRecord(value: unknown): value is GooSchemaData {
	return Boolean(value)
		&& typeof value === 'object'
		&& !Array.isArray(value)
		&& Object.getPrototypeOf(value) === Object.prototype
}

function nodeHasConditions(node: GooSchemaNode): boolean {
	if (node.if !== undefined || node.unless !== undefined) return true
	if ('children' in node) return node.children.some(nodeHasConditions)
	return false
}

function getNodeVisibilitySignature(node: GooSchemaNode, data: GooSchemaData): string {
	if (!shouldRenderSchemaNode(node, data)) return ''
	if ('children' in node && node.type === 'folder') {
		const children = node.children
			.map(child => getNodeVisibilitySignature(child, data))
			.filter(Boolean)
			.join(',')
		return `folder:${ node.title }:${ node.className ?? '' }:[${ children }]`
	}
	if ('path' in node) {
		return `field:${ node.path }:${ node.type ?? '' }:${ node.label ?? '' }`
	}
	if (node.type === 'widget') {
		return `widget:${ node.id ?? '' }:${ node.widget }:${ node.label ?? '' }`
	}
	if (node.type === 'note') {
		return `note:${ node.text }:${ node.className ?? '' }`
	}
	return ''
}

export function isSchemaValueEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true
	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
		return left.every((value, index) => isSchemaValueEqual(value, right[index]))
	}
	if (isPlainRecord(left) || isPlainRecord(right)) {
		if (!isPlainRecord(left) || !isPlainRecord(right)) return false
		const leftKeys = Object.keys(left)
		const rightKeys = Object.keys(right)
		if (leftKeys.length !== rightKeys.length) return false
		return leftKeys.every(key => key in right && isSchemaValueEqual(left[key], right[key]))
	}
	return false
}
