import { svelte } from '@sveltejs/vite-plugin-svelte'
import { transformWithOxc, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { resolveTestArtifactDirectory, resolveViteCacheDirectory } from './scripts/testStorage.ts'

const TEST_SOURCE_RE = /(?:\/__tests__\/.*|\.test)\.ts(?:\?.*)?$/

const transformTestsWithoutProductionTsconfig = (): Plugin => ({
	name: 'goo-test-source-transform',
	enforce: 'pre',
	configEnvironment: {
		order: 'post',
		handler(_name, config) {
			config.optimizeDeps ??= {}
			config.optimizeDeps.rolldownOptions = {
				...config.optimizeDeps.rolldownOptions,
				tsconfig: false
			}
		}
	},
	transform(code, id) {
		if (!TEST_SOURCE_RE.test(id)) return
		return transformWithOxc(code, id, { tsconfig: false })
	}
})

export default defineConfig({
	cacheDir: resolveViteCacheDirectory(import.meta.dirname),
	oxc: {
		// Tests intentionally live outside the production TypeScript project and
		// are transformed by the focused pre-plugin above.
		exclude: TEST_SOURCE_RE
	},
	plugins: [transformTestsWithoutProductionTsconfig(), svelte({ configFile: false })],
	resolve: {
		conditions: ['browser']
	},
	ssr: {
		noExternal: ['@lucide/svelte']
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{js,ts}', 'scripts/**/*.test.ts'],
		exclude: ['src/**/playwright/**'],
		globals: true,
		setupFiles: ['src/__tests__/setup.ts'],
		deps: {
			optimizer: {
				client: { enabled: false },
				ssr: { enabled: false }
			}
		},
		coverage: {
			reportsDirectory: resolveTestArtifactDirectory(import.meta.dirname, 'coverage')
		}
	}
})
