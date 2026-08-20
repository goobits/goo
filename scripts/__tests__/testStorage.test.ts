import { afterEach, describe, expect, test } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveTestArtifactDirectory, resolveViteCacheDirectory } from '../testStorage.ts'

const temporaryRoots: string[] = []

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true })
	}
})

function storageFixture() {
	const root = mkdtempSync(path.join(tmpdir(), 'goo-test-storage-'))
	const project = path.join(root, 'project')
	const cache = path.join(root, 'cache')
	mkdirSync(project)
	temporaryRoots.push(root)
	return { cache, project }
}

describe('Goo test storage', () => {
	test('uses any absolute external cache root', () => {
		const { cache, project } = storageFixture()
		const resolved = resolveViteCacheDirectory(project, { GOOBITS_CACHE_ROOT: cache })

		expect(existsSync(cache)).toBe(true)
		expect(resolved.startsWith(`${realpathSync.native(cache)}${path.sep}`)).toBe(true)
		expect(resolved.endsWith(path.join('build', 'tests', 'cache', 'vite'))).toBe(true)
	})

	test('keeps named artifacts under the same external root', () => {
		const { cache, project } = storageFixture()

		expect(
			resolveTestArtifactDirectory(project, 'playwright', {
				GOOBITS_CACHE_ROOT: cache
			}).endsWith(path.join('build', 'tests', 'artifacts', 'playwright'))
		).toBe(true)
	})

	test('rejects relative and overlapping cache roots', () => {
		const { project } = storageFixture()

		expect(() =>
			resolveViteCacheDirectory(project, { GOOBITS_CACHE_ROOT: 'relative-cache' })
		).toThrow('GOOBITS_CACHE_ROOT must be absolute')
		expect(() =>
			resolveViteCacheDirectory(project, {
				GOOBITS_CACHE_ROOT: path.join(project, 'cache')
			})
		).toThrow('Test cache must be outside and disjoint from the project')
	})
})
