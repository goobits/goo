import { cleanup } from '@testing-library/svelte'
import { afterEach } from 'vitest'

// JSDOM has no canvas renderer; expose its effective null result without virtual-console noise.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
	configurable: true,
	value: () => null
})

afterEach(() => {
	cleanup()
})
