import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const packageRoot = new URL('..', import.meta.url)
const sourceRoot = new URL('src/', packageRoot)

const checks = [
	{ pattern: /\bexport\s+let\b/, message: 'Use $props() instead of export let.' },
	{ pattern: /\bcreateEventDispatcher\b/, message: 'Use typed callback props instead of createEventDispatcher.' },
	{ pattern: /^\s*\$:\s/m, message: 'Use Svelte 5 runes instead of $: reactive labels.' },
	{ pattern: /<slot\b/, message: 'Use Snippet props instead of <slot>.' },
	{ pattern: /\bon:[a-zA-Z]/, message: 'Use callback props instead of on:event directives.' }
]

const failures = []

for (const filePath of await collectSvelteFiles(sourceRoot)) {
	const source = await readFile(filePath, 'utf8')
	const stripped = stripStyleBlocks(source)

	for (const check of checks) {
		if (check.pattern.test(stripped)) {
			failures.push(`${ filePath.replace(packageRoot.pathname, '') }: ${ check.message }`)
		}
	}
}

if (failures.length > 0) {
	console.error('Svelte convention check failed:')
	for (const failure of failures) {
		console.error(`- ${ failure }`)
	}
	process.exitCode = 1
}

async function collectSvelteFiles(directoryUrl) {
	const entries = await readdir(directoryUrl, { withFileTypes: true })
	const files = []

	for (const entry of entries) {
		if (entry.name === 'node_modules') {
			continue
		}

		const entryUrl = new URL(`${ entry.name }${ entry.isDirectory() ? '/' : '' }`, directoryUrl)
		if (entry.isDirectory()) {
			files.push(...await collectSvelteFiles(entryUrl))
		} else if (entry.name.endsWith('.svelte')) {
			files.push(join(directoryUrl.pathname, entry.name))
		}
	}

	return files
}

function stripStyleBlocks(source) {
	return source.replaceAll(/<style[\s\S]*?<\/style>/g, '')
}
