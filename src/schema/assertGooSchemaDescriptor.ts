import type {
	GooSchemaCondition,
	GooSchemaNode,
	GooSchemaType
} from './types.ts'

const FIELD_KEYS = new Set([
	'path', 'type', 'label', 'min', 'max', 'step', 'input', 'canCross', 'canPush',
	'dual', 'xy', 'coverage', 'preset', 'presetColor', 'presetHue', 'shape', 'scale',
	'mode', 'gradient', 'marks', 'snap', 'valueBubble', 'unit', 'displayUnit', 'format',
	'valueFormat', 'showLabel', 'fullWidth', 'fullBleed', 'ticks', 'options', 'modes',
	'ariaLabel', 'class', 'dataParam', 'id', 'items', 'popoutClass', 'tabIndex',
	'controlOptions', 'if', 'unless', 'layout', 'dock', 'disabled', 'selfContained'
])
const FOLDER_KEYS = new Set([ 'type', 'title', 'className', 'open', 'children', 'if', 'unless' ])
const NOTE_KEYS = new Set([ 'type', 'text', 'className', 'if', 'unless' ])
const HEADING_KEYS = new Set([ 'type', 'text', 'icon', 'className', 'if', 'unless' ])
const WIDGET_KEYS = new Set([
	'type', 'widget', 'id', 'label', 'showLabel', 'layout', 'dock', 'className', 'options', 'if', 'unless'
])
const PANEL_KEYS = new Set([ 'type', 'title', 'docked', 'width', 'showHeader', 'children' ])
const CONDITION_KEYS = new Set([ 'path', 'equals', 'notEquals' ])
const CHOICE_KEYS = new Set([
	'id', 'key', 'value', 'label', 'icon', 'tooltip', 'ariaLabel', 'hideLabel', 'className', 'disabled',
	'if', 'unless'
])

/**
 * Assert that a GooSchema description contains only declared, portable data.
 * Runtime components and callbacks belong in the named control registry.
 */
export function assertGooSchemaDescriptor(
	descriptor: unknown
): asserts descriptor is GooSchemaType | GooSchemaNode {
	assertPortableValue(descriptor, 'schema', new WeakSet())

	if (Array.isArray(descriptor)) {
		assertNodes(descriptor, 'schema')
		return
	}

	const root = expectRecord(descriptor, 'schema')
	if (root.type === 'panel') {
		assertPanel(root, 'schema')
		return
	}
	assertNode(root, 'schema')
}

function assertPortableValue(value: unknown, path: string, ancestors: WeakSet<object>): void {
	if (value === undefined || value === null) return

	switch (typeof value) {
		case 'string':
		case 'boolean':
			return
		case 'number':
			if (Number.isFinite(value)) return
			return fail(path, 'must use a finite number')
		case 'function':
		case 'symbol':
		case 'bigint':
			fail(path, `must be plain data; found ${ typeof value }`)
	}

	const object = value as object
	if (ancestors.has(object)) fail(path, 'must be plain data; found a cycle')

	if (!Array.isArray(object)) {
		const prototype = Object.getPrototypeOf(object)
		if (prototype !== Object.prototype && prototype !== null) {
			const name = (object as { constructor?: { name?: string } }).constructor?.name || 'object'
			fail(path, `must be plain data; found constructed ${ name }`)
		}
		const symbol = Object.getOwnPropertySymbols(object)[0]
		if (symbol) fail(path, `must use string keys; found ${ String(symbol) }`)
	}

	ancestors.add(object)
	for (const [ key, property ] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
		if ('get' in property || 'set' in property) {
			fail(joinPath(path, key), 'must be a data property; found an accessor')
		}
		if (!property.enumerable && !Array.isArray(object)) {
			fail(joinPath(path, key), 'must be enumerable')
		}
		if (property.enumerable) {
			assertPortableValue(property.value, joinPath(path, key), ancestors)
		}
	}
	ancestors.delete(object)
}

function assertPanel(panel: Record<string, unknown>, path: string): void {
	assertKnownKeys(panel, PANEL_KEYS, path, 'panel')
	assertOptionalString(panel, 'title', path)
	assertOptionalBoolean(panel, 'docked', path)
	assertOptionalNumber(panel, 'width', path)
	assertOptionalBoolean(panel, 'showHeader', path)
	assertNodes(expectArray(panel.children, `${ path }.children`), `${ path }.children`)
}

function assertNodes(nodes: readonly unknown[], path: string): void {
	for (let index = 0; index < nodes.length; index += 1) {
		assertNode(expectRecord(nodes[index], `${ path }[${ index }]`), `${ path }[${ index }]`)
	}
}

function assertNode(node: Record<string, unknown>, path: string): void {
	switch (node.type) {
		case 'folder':
			assertFolder(node, path)
			return
		case 'heading':
			assertHeading(node, path)
			return
		case 'note':
			assertNote(node, path)
			return
		case 'widget':
			assertWidget(node, path)
			return
		case 'panel':
			return fail(`${ path }.type`, 'a panel can only be the schema root')
		default:
			assertField(node, path)
	}
}

function assertFolder(folder: Record<string, unknown>, path: string): void {
	assertKnownKeys(folder, FOLDER_KEYS, path, 'folder')
	expectNonEmptyString(folder.title, `${ path }.title`)
	assertOptionalString(folder, 'className', path)
	assertOptionalBoolean(folder, 'open', path)
	assertConditions(folder, path)
	assertNodes(expectArray(folder.children, `${ path }.children`), `${ path }.children`)
}

function assertNote(note: Record<string, unknown>, path: string): void {
	assertKnownKeys(note, NOTE_KEYS, path, 'note')
	expectString(note.text, `${ path }.text`)
	assertOptionalString(note, 'className', path)
	assertConditions(note, path)
}

function assertHeading(heading: Record<string, unknown>, path: string): void {
	assertKnownKeys(heading, HEADING_KEYS, path, 'heading')
	expectString(heading.text, `${ path }.text`)
	assertOptionalString(heading, 'icon', path)
	assertOptionalString(heading, 'className', path)
	assertConditions(heading, path)
}

function assertWidget(widget: Record<string, unknown>, path: string): void {
	assertKnownKeys(widget, WIDGET_KEYS, path, 'widget')
	expectNonEmptyString(widget.widget, `${ path }.widget`)
	assertOptionalString(widget, 'id', path)
	assertOptionalString(widget, 'label', path)
	assertOptionalString(widget, 'layout', path)
	assertOptionalString(widget, 'dock', path)
	assertOptionalString(widget, 'className', path)
	assertOptionalBoolean(widget, 'showLabel', path)
	if (widget.options !== undefined) expectRecord(widget.options, `${ path }.options`)
	assertConditions(widget, path)
}

function assertField(field: Record<string, unknown>, path: string): void {
	assertKnownKeys(field, FIELD_KEYS, path, 'field')
	expectNonEmptyString(field.path, `${ path }.path`)

	for (const key of [
		'type', 'label', 'preset', 'presetColor', 'shape', 'scale', 'mode',
		'unit', 'displayUnit', 'format', 'valueFormat', 'ariaLabel', 'class', 'dataParam',
		'id', 'popoutClass', 'layout'
	]) assertOptionalString(field, key, path)
	for (const key of [ 'min', 'max', 'step', 'presetHue', 'tabIndex' ]) {
		assertOptionalNumber(field, key, path)
	}
	for (const key of [
		'input', 'canCross', 'canPush', 'dual', 'xy', 'coverage', 'showLabel', 'fullWidth',
		'fullBleed', 'ticks', 'disabled', 'selfContained'
	]) assertOptionalBoolean(field, key, path)

	assertOptionalArray(field, 'gradient', path)
	assertOptionalArray(field, 'marks', path)
	assertOptionalArray(field, 'modes', path)
	assertOptionalArray(field, 'items', path)
	if (
		field.valueBubble !== undefined
		&& typeof field.valueBubble !== 'string'
		&& typeof field.valueBubble !== 'boolean'
	) fail(`${ path }.valueBubble`, 'must be a string or boolean')
	if (field.snap !== undefined && typeof field.snap !== 'boolean' && !Array.isArray(field.snap)) {
		fail(`${ path }.snap`, 'must be a boolean or array')
	}
	if (field.controlOptions !== undefined) expectRecord(field.controlOptions, `${ path }.controlOptions`)
	assertChoiceOptions(field.options, `${ path }.options`)
	assertConditions(field, path)
}

function assertChoiceOptions(value: unknown, path: string): void {
	if (value === undefined) return
	const options = expectArray(value, path)
	for (let index = 0; index < options.length; index += 1) {
		const option = options[index]
		const optionPath = `${ path }[${ index }]`
		if (typeof option === 'string' || typeof option === 'number') continue
		const choice = expectRecord(option, optionPath)
		assertKnownKeys(choice, CHOICE_KEYS, optionPath, 'choice option')
		for (const key of [ 'id', 'key', 'value', 'label' ]) {
			const item = choice[key]
			if (item !== undefined && typeof item !== 'string' && typeof item !== 'number') {
				fail(`${ optionPath }.${ key }`, 'must be a string or number')
			}
		}
		for (const key of [ 'icon', 'tooltip', 'ariaLabel', 'className' ]) {
			assertOptionalString(choice, key, optionPath)
		}
		for (const key of [ 'hideLabel', 'disabled' ]) assertOptionalBoolean(choice, key, optionPath)
		assertConditions(choice, optionPath)
	}
}

function assertConditions(node: Record<string, unknown>, path: string): void {
	assertCondition(node.if, `${ path }.if`)
	assertCondition(node.unless, `${ path }.unless`)
}

function assertCondition(value: unknown, path: string): asserts value is GooSchemaCondition | undefined {
	if (value === undefined || typeof value === 'string') return
	const condition = expectRecord(value, path)
	assertKnownKeys(condition, CONDITION_KEYS, path, 'condition')
	expectNonEmptyString(condition.path, `${ path }.path`)
}

function assertKnownKeys(
	value: Record<string, unknown>,
	allowed: ReadonlySet<string>,
	path: string,
	kind: string
): void {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) fail(`${ path }.${ key }`, `is not a declared GooSchema ${ kind } key`)
	}
}

function assertOptionalArray(value: Record<string, unknown>, key: string, path: string): void {
	if (value[key] !== undefined) expectArray(value[key], `${ path }.${ key }`)
}

function assertOptionalBoolean(value: Record<string, unknown>, key: string, path: string): void {
	if (value[key] !== undefined && typeof value[key] !== 'boolean') {
		fail(`${ path }.${ key }`, 'must be a boolean')
	}
}

function assertOptionalNumber(value: Record<string, unknown>, key: string, path: string): void {
	if (value[key] !== undefined && typeof value[key] !== 'number') {
		fail(`${ path }.${ key }`, 'must be a number')
	}
}

function assertOptionalString(value: Record<string, unknown>, key: string, path: string): void {
	if (value[key] !== undefined) expectString(value[key], `${ path }.${ key }`)
}

function expectArray(value: unknown, path: string): readonly unknown[] {
	if (!Array.isArray(value)) fail(path, 'must be an array')
	return value
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object')
	return value as Record<string, unknown>
}

function expectNonEmptyString(value: unknown, path: string): string {
	const result = expectString(value, path)
	if (!result.length) fail(path, 'must not be empty')
	return result
}

function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string') fail(path, 'must be a string')
	return value
}

function joinPath(path: string, key: string): string {
	return /^\d+$/.test(key) ? `${ path }[${ key }]` : `${ path }.${ key }`
}

function fail(path: string, reason: string): never {
	throw new TypeError(`[GooSchema] Invalid descriptor at '${ path }': ${ reason }.`)
}
