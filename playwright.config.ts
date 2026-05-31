import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.GOO_PLAYWRIGHT_PORT ?? 4177)
const baseURL = `http://127.0.0.1:${ port }`

export default defineConfig({
	testDir: './src/__tests__/playwright',
	testMatch: '**/*.test.ts',
	timeout: 30000,
	expect: {
		timeout: 5000
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : 4,
	reporter: [ [ 'list' ] ],
	use: {
		...devices['Desktop Chrome'],
		baseURL,
		headless: true,
		trace: 'on-first-retry',
		viewport: { width: 1280, height: 720 }
	},
	webServer: {
		command: `pnpm exec vite --host 127.0.0.1 --port ${ port }`,
		url: `${ baseURL }/src/__tests__/fixtures/test-harness.html`,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	}
})
