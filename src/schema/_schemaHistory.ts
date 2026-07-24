import {
	cloneSchemaData,
	cloneSchemaValue,
	isSchemaDataEqual,
	isSchemaValueEqual
} from './_schemaData.ts'
import { getByPath, setByPath } from './pathUtils.ts'
import type { GooSchemaData } from './types.ts'

export const ROOT_SCHEMA_HISTORY_SCOPE = 'schema'

export type SchemaHistoryScope = {
	history: boolean
	id: string
	paths?: readonly string[]
}

export type SchemaHistoryNavigation = {
	data: GooSchemaData
	paths: string[]
}

type SchemaHistoryTimeline = {
	index: number
	snapshots: GooSchemaData[]
}

const MAX_SCHEMA_HISTORY_LENGTH = 100

/** One schema-owned history coordinator with root and folder-scoped views. */
export type SchemaHistory = {
	canRedo(scopeId: string): boolean
	canUndo(scopeId: string): boolean
	configure(
		scopes: readonly SchemaHistoryScope[],
		data: GooSchemaData,
		prune?: boolean
	): void
	getScopePaths(scopeId: string): readonly string[] | undefined
	navigate(
		scopeId: string,
		direction: 'redo' | 'undo',
		data: GooSchemaData
	): SchemaHistoryNavigation | undefined
	rebase(data: GooSchemaData): void
	record(data: GooSchemaData, changedPaths?: readonly string[]): void
}

/** Create the bounded history used by all GooSchema action scopes. */
export function createSchemaHistory(): SchemaHistory {
	let scopes = new Map<string, SchemaHistoryScope>()
	const timelines = new Map<string, SchemaHistoryTimeline>()

	return {
		canRedo: scopeId => {
			const timeline = timelines.get(scopeId)
			return Boolean(timeline && timeline.index < timeline.snapshots.length - 1)
		},
		canUndo: scopeId => {
			const timeline = timelines.get(scopeId)
			return Boolean(timeline && timeline.index > 0)
		},
		configure(nextScopes, data, prune = true) {
			const previousScopes = scopes
			const incomingScopes = new Map(
				nextScopes.map(scope => [ scope.id, normalizeScope(scope) ])
			)
			scopes = prune
				? incomingScopes
				: new Map([ ...scopes, ...incomingScopes ])

			for (const [ scopeId, timeline ] of timelines) {
				const previous = previousScopes.get(scopeId)
				const next = scopes.get(scopeId)
				if (!next?.history) {
					timelines.delete(scopeId)
					continue
				}
				if (!previous || !samePaths(previous.paths, next.paths)) {
					resetTimeline(timeline, captureScope(data, next.paths))
				}
			}

			for (const scope of scopes.values()) {
				if (scope.history && !timelines.has(scope.id)) {
					timelines.set(scope.id, createTimeline(captureScope(data, scope.paths)))
				}
			}
		},
		getScopePaths: scopeId => scopes.get(scopeId)?.paths,
		navigate(scopeId, direction, data) {
			const scope = scopes.get(scopeId)
			const timeline = timelines.get(scopeId)
			if (!scope || !timeline) return

			const nextIndex = direction === 'undo'
				? timeline.index - 1
				: timeline.index + 1
			if (nextIndex < 0 || nextIndex >= timeline.snapshots.length) return

			const previousIndex = timeline.index
			timeline.index = nextIndex
			const nextData = applyScopeSnapshot(
				data,
				timeline.snapshots[nextIndex],
				scope.paths
			)
			const changedPaths = collectChangedSchemaDataPaths(data, nextData)
			if (!changedPaths.length) {
				timeline.index = previousIndex
				return
			}

			if (scopeId === ROOT_SCHEMA_HISTORY_SCOPE) {
				for (const [ otherScopeId, otherTimeline ] of timelines) {
					if (otherScopeId === scopeId) continue
					const otherScope = scopes.get(otherScopeId)
					if (otherScope) {
						resetTimeline(otherTimeline, captureScope(nextData, otherScope.paths))
					}
				}
			} else {
				for (const [ otherScopeId, otherTimeline ] of timelines) {
					if (otherScopeId === scopeId) continue
					const otherScope = scopes.get(otherScopeId)
					if (
						otherScope
						&& scopeTouchesPaths(otherScope, changedPaths)
					) {
						pushTimeline(otherTimeline, captureScope(nextData, otherScope.paths))
					}
				}
			}

			return { data: nextData, paths: changedPaths }
		},
		rebase(data) {
			for (const [ scopeId, timeline ] of timelines) {
				const scope = scopes.get(scopeId)
				if (scope) resetTimeline(timeline, captureScope(data, scope.paths))
			}
		},
		record(data, changedPaths) {
			for (const [ scopeId, timeline ] of timelines) {
				const scope = scopes.get(scopeId)
				if (!scope || !scopeTouchesPaths(scope, changedPaths)) continue
				pushTimeline(timeline, captureScope(data, scope.paths))
			}
		}
	}

	function normalizeScope(scope: SchemaHistoryScope): SchemaHistoryScope {
		return {
			...scope,
			paths: scope.paths ? [ ...new Set(scope.paths) ] : undefined
		}
	}
}

/** Read the paths whose values differ between two schema data records. */
export function collectChangedSchemaDataPaths(
	previous: GooSchemaData,
	next: GooSchemaData
): string[] {
	const paths: string[] = []
	appendChangedPaths(previous, next, '', paths)
	return paths
}

/** Return whether a scope currently matches its portion of schema defaults. */
export function schemaScopeMatchesDefaults(
	data: GooSchemaData,
	defaults: GooSchemaData,
	paths: readonly string[] | undefined
): boolean {
	if (!paths) {
		return Object.entries(defaults).every(([ key, value ]) =>
			schemaValueMatchesDefault(data[key], value)
		)
	}
	return paths.every(path => {
		const defaultValue = getByPath(defaults, path)
		return defaultValue === undefined
			|| schemaValueMatchesDefault(getByPath(data, path), defaultValue)
	})
}

/** Apply only one scope's default values to a cloned schema data record. */
export function applySchemaScopeDefaults(
	data: GooSchemaData,
	defaults: GooSchemaData,
	paths: readonly string[] | undefined
): GooSchemaData {
	const next = cloneSchemaData(data)
	if (!paths) {
		applyDefaultValues(next, defaults)
		return next
	}
	for (const path of paths) {
		const defaultValue = getByPath(defaults, path)
		if (defaultValue !== undefined) {
			setByPath(next, path, cloneSchemaValue(defaultValue))
		}
	}
	return next
}

function applyDefaultValues(target: GooSchemaData, defaults: GooSchemaData): void {
	for (const [ key, defaultValue ] of Object.entries(defaults)) {
		const currentValue = target[key]
		if (isSchemaData(currentValue) && isSchemaData(defaultValue)) {
			applyDefaultValues(currentValue, defaultValue)
		} else {
			target[key] = cloneSchemaValue(defaultValue)
		}
	}
}

function isSchemaData(value: unknown): value is GooSchemaData {
	return Boolean(value)
		&& typeof value === 'object'
		&& !Array.isArray(value)
		&& Object.getPrototypeOf(value) === Object.prototype
}

function schemaValueMatchesDefault(value: unknown, defaultValue: unknown): boolean {
	if (!isSchemaData(defaultValue)) return isSchemaValueEqual(value, defaultValue)
	if (!isSchemaData(value)) return false
	return Object.entries(defaultValue).every(([ key, childDefault ]) =>
		schemaValueMatchesDefault(value[key], childDefault)
	)
}

function createTimeline(initialSnapshot: GooSchemaData): SchemaHistoryTimeline {
	return { index: 0, snapshots: [ initialSnapshot ] }
}

function resetTimeline(
	timeline: SchemaHistoryTimeline,
	snapshot: GooSchemaData
): void {
	timeline.snapshots.splice(0, timeline.snapshots.length, snapshot)
	timeline.index = 0
}

function pushTimeline(
	timeline: SchemaHistoryTimeline,
	snapshot: GooSchemaData
): void {
	if (isSchemaDataEqual(timeline.snapshots[timeline.index], snapshot)) return
	timeline.snapshots.splice(timeline.index + 1)
	timeline.snapshots.push(snapshot)
	if (timeline.snapshots.length > MAX_SCHEMA_HISTORY_LENGTH) {
		timeline.snapshots.shift()
	}
	timeline.index = timeline.snapshots.length - 1
}

function captureScope(
	data: GooSchemaData,
	paths: readonly string[] | undefined
): GooSchemaData {
	if (!paths) return cloneSchemaData(data)
	const snapshot: GooSchemaData = {}
	for (const path of paths) {
		setByPath(snapshot, path, cloneSchemaValue(getByPath(data, path)))
	}
	return snapshot
}

function applyScopeSnapshot(
	data: GooSchemaData,
	snapshot: GooSchemaData,
	paths: readonly string[] | undefined
): GooSchemaData {
	if (!paths) return cloneSchemaData(snapshot)
	const next = cloneSchemaData(data)
	for (const path of paths) {
		setByPath(next, path, cloneSchemaValue(getByPath(snapshot, path)))
	}
	return next
}

function samePaths(
	left: readonly string[] | undefined,
	right: readonly string[] | undefined
): boolean {
	if (!left || !right) return left === right
	return left.length === right.length
		&& left.every((path, index) => path === right[index])
}

function scopeTouchesPaths(
	scope: SchemaHistoryScope,
	changedPaths: readonly string[] | undefined
): boolean {
	if (!changedPaths?.length || !scope.paths) return true
	return scope.paths.some(scopePath =>
		changedPaths.some(changedPath => pathsOverlap(scopePath, changedPath))
	)
}

function pathsOverlap(left: string, right: string): boolean {
	return left === right
		|| left.startsWith(`${ right }.`)
		|| right.startsWith(`${ left }.`)
}

function appendChangedPaths(
	previous: unknown,
	next: unknown,
	prefix: string,
	paths: string[]
): void {
	if (isSchemaValueEqual(previous, next)) return
	if (isPlainRecord(previous) && isPlainRecord(next)) {
		const keys = new Set([ ...Object.keys(previous), ...Object.keys(next) ])
		for (const key of keys) {
			appendChangedPaths(
				previous[key],
				next[key],
				prefix ? `${ prefix }.${ key }` : key,
				paths
			)
		}
		return
	}
	if (prefix) paths.push(prefix)
}

function isPlainRecord(value: unknown): value is GooSchemaData {
	return Boolean(value)
		&& typeof value === 'object'
		&& !Array.isArray(value)
		&& Object.getPrototypeOf(value) === Object.prototype
}
