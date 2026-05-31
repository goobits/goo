/**
 * @fileoverview Minimal event emitter for Goo controllers.
 * Provides simple pub/sub with both mixin and factory patterns.
 * @module goobits/utils/emitter
 */

export type Handler = (...args: unknown[]) => void

export interface Emitter {
	on: (type: string, handler: Handler) => () => void
	off: (type: string, handler: Handler) => void
	emit: (type: string, ...args: unknown[]) => void
}

/**
 * Create emitter methods backed by a handlers map.
 * Core implementation shared by mixin and factory patterns.
 */
function createEmitterMethods(onError?: (error: unknown) => void): Emitter {
	const handlers = new Map<string, Set<Handler>>()

	const on = (type: string, handler: Handler): (() => void) => {
		let set = handlers.get(type)
		if (!set) {
			set = new Set()
			handlers.set(type, set)
		}
		set.add(handler)

		// Return detach function
		return () => off(type, handler)
	}

	const off = (type: string, handler: Handler): void => {
		handlers.get(type)?.delete(handler)
	}

	const emit = (type: string, ...args: unknown[]): void => {
		const set = handlers.get(type)
		if (set) {
			for (const handler of set) {
				if (onError) {
					try {
						handler(...args)
					} catch(e) {
						onError(e)
					}
				} else {
					handler(...args)
				}
			}
		}
	}

	return { on, off, emit }
}

/**
 * Create a standalone event emitter.
 * Use this when you need a simple pub/sub without attaching to an object.
 *
 * @param onError - Optional error handler for caught exceptions in handlers
 *
 * @example
 * const events = createEmitter()
 * const detach = events.on('change', (data) => console.log(data))
 * events.emit('change', { value: 42 })
 * detach() // or events.off('change', handler)
 */
export function createEmitter(onError?: (error: unknown) => void): Emitter {
	return createEmitterMethods(onError)
}

/**
 * Add minimal emitter functionality to an object (mixin pattern).
 * Provides on(), off(), and emit() methods.
 *
 * @example
 * class MyComponent {
 *   constructor() {
 *     emitter(this)
 *   }
 *   doSomething() {
 *     this.emit('done', { result: 42 })
 *   }
 * }
 *
 * const comp = new MyComponent()
 * const detach = comp.on('done', (data) => console.log(data.result))
 * // Later: detach() to unsubscribe
 */
export function emitter<T extends object>(target: T): T & Emitter {
	const methods = createEmitterMethods()
	const result = target as T & Emitter
	result.on = methods.on
	result.off = methods.off
	result.emit = methods.emit
	return result
}
