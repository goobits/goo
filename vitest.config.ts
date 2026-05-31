import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [ svelte() ],
	resolve: {
		conditions: [ 'browser' ]
	},
	test: {
		environment: 'jsdom',
		include: [ 'src/**/*.test.{js,ts}' ],
		exclude: [ 'src/**/playwright/**' ],
		globals: true,
		setupFiles: [ 'src/__tests__/setup.ts' ],
		deps: {
			optimizer: {
				enabled: false
			}
		}
	}
})
