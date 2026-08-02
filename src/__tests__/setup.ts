import { cleanup } from '@testing-library/svelte'
import { afterEach } from 'vitest'

// jsdom reports canvas access as an environment error before returning null.
// Match that return value without polluting otherwise successful test output.
if (typeof HTMLCanvasElement !== 'undefined') {
	Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
		configurable: true,
		value: () => null
	})
}

afterEach(() => {
	cleanup()
})
