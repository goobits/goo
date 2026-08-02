import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { resolveViteCacheDirectory } from './scripts/testStorage.ts'

export default defineConfig({
	cacheDir: resolveViteCacheDirectory(import.meta.dirname),
	plugins: [svelte()],
	resolve: {
		conditions: ['browser']
	}
})
