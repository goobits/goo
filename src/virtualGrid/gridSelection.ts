export interface GridSelectionState {
	selection: Set<string>
	lastClicked: string | null
}

export interface GridClickModifiers {
	shift: boolean
	meta: boolean
}

export function nextGridClickSelection(
	current: ReadonlySet<string>,
	lastClicked: string | null,
	key: string,
	modifiers: GridClickModifiers,
	orderedKeys: readonly string[]
): GridSelectionState {
	if (modifiers.shift && lastClicked) {
		const fromIdx = orderedKeys.indexOf(lastClicked)
		const toIdx = orderedKeys.indexOf(key)
		const next = new Set(current)
		if (fromIdx < 0 || toIdx < 0) {
			next.add(key)
			return { selection: next, lastClicked }
		}
		const [ lo, hi ] = fromIdx < toIdx ? [ fromIdx, toIdx ] : [ toIdx, fromIdx ]
		for (let i = lo; i <= hi; i++) next.add(orderedKeys[i])
		return { selection: next, lastClicked }
	}
	if (modifiers.meta) {
		const next = new Set(current)
		if (next.has(key)) next.delete(key)
		else next.add(key)
		return { selection: next, lastClicked: key }
	}
	if (current.has(key) && current.size === 1) {
		return { selection: new Set(), lastClicked: null }
	}
	return { selection: new Set([ key ]), lastClicked: key }
}

export function nextGridMarqueeSelection(
	initial: ReadonlySet<string>,
	hits: ReadonlySet<string>,
	mode: 'replace' | 'additive'
): Set<string> {
	if (mode === 'additive') {
		const next = new Set(initial)
		for (const k of hits) next.add(k)
		return next
	}
	return new Set(hits)
}

export function sameGridSelection(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
	if (a.size !== b.size) return false
	for (const key of a) {
		if (!b.has(key)) return false
	}
	return true
}
