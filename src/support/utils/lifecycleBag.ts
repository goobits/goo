export type GooLifecycleCleanup = () => void
export type GooLifecycleHandle = GooLifecycleCleanup | {
	destroy?: () => void | Promise<void>
	detach?: () => void
	disconnect?: () => void
}

export interface GooLifecycleBag {
	readonly destroyed: boolean
	add(handle: GooLifecycleHandle): GooLifecycleCleanup
	frame(callback: FrameRequestCallback): GooLifecycleCleanup
	listen<K extends keyof DocumentEventMap>(
		target: Document,
		type: K,
		listener: (event: DocumentEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): GooLifecycleCleanup
	listen<K extends keyof HTMLElementEventMap>(
		target: HTMLElement,
		type: K,
		listener: (event: HTMLElementEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): GooLifecycleCleanup
	listen<K extends keyof WindowEventMap>(
		target: Window,
		type: K,
		listener: (event: WindowEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): GooLifecycleCleanup
	listen(
		target: EventTarget,
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions
	): GooLifecycleCleanup
	timeout(callback: () => void, delay?: number): GooLifecycleCleanup
	destroy(): void
}

/** Create a small owner for listeners, timers, frames, observers, and destroyable handles. */
export function createLifecycleBag(): GooLifecycleBag {
	let destroyed = false
	const cleanups = new Set<GooLifecycleCleanup>()

	const bag: GooLifecycleBag = {
		get destroyed() {
			return destroyed
		},
		add(handle) {
			if (destroyed) {
				runHandle(handle)
				return noop
			}

			let active = true
			const cleanup = () => {
				if (!active) return
				active = false
				cleanups.delete(cleanup)
				runHandle(handle)
			}
			cleanups.add(cleanup)
			return cleanup
		},
		frame(callback) {
			let cancel: GooLifecycleCleanup = noop
			const frameId = requestAnimationFrame(time => {
				cancel()
				if (!destroyed) callback(time)
			})
			cancel = bag.add(() => cancelAnimationFrame(frameId))
			return cancel
		},
		listen(
			target: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions
		) {
			target.addEventListener(type, listener, options)
			return bag.add(() => target.removeEventListener(type, listener, options))
		},
		timeout(callback, delay) {
			let cancel: GooLifecycleCleanup = noop
			const timer = setTimeout(() => {
				cancel()
				if (!destroyed) callback()
			}, delay)
			cancel = bag.add(() => clearTimeout(timer))
			return cancel
		},
		destroy() {
			if (destroyed) return
			destroyed = true
			for (const cleanup of Array.from(cleanups)) {
				cleanup()
			}
			cleanups.clear()
		}
	}

	return bag
}

function noop(): void {}

function runHandle(handle: GooLifecycleHandle): void {
	if (typeof handle === 'function') {
		handle()
		return
	}
	handle.detach?.()
	handle.disconnect?.()
	void handle.destroy?.()
}
