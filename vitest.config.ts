import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { resolveViteCacheDirectory } from './scripts/testStorage.ts'

export default defineConfig({
	cacheDir: resolveViteCacheDirectory(import.meta.dirname),
	plugins: [svelte()],
	resolve: {
		conditions: ['browser']
	},
	ssr: {
		noExternal: ['@lucide/svelte']
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{js,ts}'],
		exclude: ['src/**/playwright/**'],
		globals: true,
		setupFiles: ['src/__tests__/setup.ts'],
		deps: {
			optimizer: {
				enabled: false
			}
		}
	}
})
