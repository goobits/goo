/**
 * Guards against two CSS patterns that fail silently at runtime:
 *
 * 1. Unitless zero custom properties. `calc(8px - 0)` is invalid CSS, so a
 *    `--goo-*: 0` token that later feeds a calc() sum silently drops the whole
 *    declaration (this has broken menu row padding, number stepper reserve,
 *    and the angle input's arrow gutter). Zeros must be typed (`0px`, `0em`)
 *    unless the token is a genuine number (index, count, hue, opacity, scale).
 *
 * 2. Theme transition tokens composed with an easing keyword. The tokens
 *    bundle their own easing (`0.15s ease`), so `transition: opacity
 *    var(--goo-theme-transition-normal) ease-out` parses as two easings and
 *    the browser drops the transition (this killed the dialog fades and the
 *    submenu cross-fade). Compose bare durations instead.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const packageRoot = new URL('..', import.meta.url)
const sourceRoot = new URL('src/', packageRoot)

/** Tokens that are legitimately unitless numbers. */
const NUMBER_TOKEN_PATTERN = /(index|count|hue|opacity|scale|weight|grow|shrink|order|columns|rows)/

const failures: string[] = []

for (const filePath of await collectStyleFiles(sourceRoot)) {
	const source = await readFile(filePath, 'utf8')
	const styles = filePath.endsWith('.svelte') ? extractStyleBlocks(source) : source
	if (!styles) continue

	const relativePath = filePath.replace(packageRoot.pathname, '')
	checkUnitlessZeroTokens(relativePath, styles)
	checkBundledTransitionTokens(relativePath, styles)
}

if (failures.length > 0) {
	console.error('CSS convention check failed:')
	for (const failure of failures) {
		console.error(`- ${ failure }`)
	}
	process.exitCode = 1
}

function checkUnitlessZeroTokens(relativePath: string, styles: string): void {
	for (const match of styles.matchAll(/(--goo-[a-z0-9-]+)\s*:\s*0\s*;/g)) {
		const token = match[1]
		if (NUMBER_TOKEN_PATTERN.test(token)) continue
		failures.push(
			`${ relativePath }: ${ token } is a unitless 0; type it (0px/0em) so calc() sums cannot silently invalidate.`
		)
	}

	for (const match of styles.matchAll(/calc\([^()]*var\((--goo-[a-z0-9-]+),\s*0\s*\)/g)) {
		failures.push(
			`${ relativePath }: var(${ match[1] }, 0) fallback inside calc(); use a typed zero (0px/0em).`
		)
	}
}

function checkBundledTransitionTokens(relativePath: string, styles: string): void {
	// Normalize declarations onto single lines so multiline shorthands match.
	const flattened = styles.replace(/\s+/g, ' ')
	const pattern = /var\(--goo-[a-z0-9-]*(?:transition|motion)[a-z0-9-]*\)\s+(?:ease|linear|cubic-bezier|steps)/g
	for (const match of flattened.matchAll(pattern)) {
		failures.push(
			`${ relativePath }: "${ match[0] }" composes a bundled transition token with an easing; use a bare duration.`
		)
	}
}

function extractStyleBlocks(source: string): string {
	return [ ...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g) ]
		.map(match => match[1])
		.join('\n')
}

async function collectStyleFiles(directoryUrl: URL): Promise<string[]> {
	const entries = await readdir(directoryUrl, { withFileTypes: true })
	const files: string[] = []

	for (const entry of entries) {
		if (entry.name === 'node_modules' || entry.name === '__tests__') {
			continue
		}

		const entryUrl = new URL(`${ entry.name }${ entry.isDirectory() ? '/' : '' }`, directoryUrl)
		if (entry.isDirectory()) {
			files.push(...await collectStyleFiles(entryUrl))
		} else if (entry.name.endsWith('.css') || entry.name.endsWith('.svelte')) {
			files.push(join(directoryUrl.pathname, entry.name))
		}
	}

	return files
}
