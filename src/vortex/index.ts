import { mount, unmount } from 'svelte'

import GooVortexComponent from './GooVortex.svelte'
import type {
	GooVortexComponentHandle,
	GooVortexCreateOptions,
	GooVortexInstance,
	GooVortexManager,
	GooVortexOptions,
	GooVortexUpdateOptions
} from './types.ts'

export type {
	GooVortexCreateOptions,
	GooVortexManager,
	GooVortexOptions,
	GooVortexPoint,
	GooVortexUpdateOptions
} from './types.ts'

/** Manager for positioned Goo vortex indicators. */
class GooVortex implements GooVortexManager {
	#running: Record<string, GooVortexInstance> = {}

	#imageUrls: string[]
	#parent: HTMLElement
	#randomize: boolean

	/**
	 * Create a Goo vortex manager.
	 * @param parent - Parent element that receives vortex elements.
	 * @param options - Vortex image and selection options.
	 */
	constructor(parent: HTMLElement, options: GooVortexOptions = {}) {
		this.#parent = parent
		this.#imageUrls = options.imageUrls ?? []
		this.#randomize = options.randomize ?? false
	}

	/**
	 * Create and display a vortex.
	 * @param options - Vortex id, center point, and optional message.
	 */
	create(options: GooVortexCreateOptions): void {
		if (!options.id) {
			window.console.warn('Missing vortex id')
			return
		}

		// Svelte's mount() does not surface a component's exported functions in its
		// return type, so annotate the imperative handle the component exposes.
		const instance = mount(GooVortexComponent, {
			target: this.#parent,
			props: { message: options.message ?? '', src: this.#getImageUrl() }
		}) as GooVortexComponentHandle

		this.#running[options.id] = { instance, time: Date.now() }

		window.setTimeout(() => {
			instance.enter(options.point)
		}, 1)
	}

	/**
	 * Update a vortex message.
	 * @param idOrOptions - Vortex id or update options.
	 * @param message - Message when the first argument is an id.
	 */
	update(idOrOptions: string | GooVortexUpdateOptions, message?: string): void {
		const id = typeof idOrOptions === 'string' ? idOrOptions : idOrOptions.id
		const nextMessage = typeof idOrOptions === 'string' ? message : idOrOptions.message
		const item = this.#running[id]
		if (!item || nextMessage === undefined) {
			return
		}

		item.instance.setMessage(nextMessage)
	}

	/**
	 * Destroy a vortex with its exit animation.
	 * @param id - Vortex id.
	 * @returns Promise that resolves with the id after exit is scheduled.
	 */
	destroy(id: string): Promise<string> {
		const item = this.#running[id]
		if (!item) {
			return Promise.reject(`No vortex with id ${ id } running`)
		}

		delete this.#running[id]

		return new Promise(resolve => {
			window.requestAnimationFrame(() => {
				item.instance.exit()

				window.setTimeout(() => {
					unmount(item.instance)
				}, 750)

				resolve(id)
			})
		})
	}

	/** Remove every active vortex with exit animations. */
	clear(): Promise<string[]> {
		return Promise.all(this.ids().map(id => this.destroy(id)))
	}

	/** Whether a vortex id is currently active. */
	has(id: string): boolean {
		return id in this.#running
	}

	/** Active vortex ids. */
	ids(): string[] {
		return Object.keys(this.#running)
	}

	/**
	 * #get image url.
	 */
	#getImageUrl(): string {
		if (!this.#imageUrls.length) {
			return ''
		}

		if (!this.#randomize) {
			return this.#imageUrls[0]
		}

		const index = Math.floor(Math.random() * this.#imageUrls.length)
		return this.#imageUrls[index] ?? this.#imageUrls[0]
	}
}

/**
 * Create a Goo vortex manager.
 * @param parent - Parent element that receives vortex elements.
 * @param options - Vortex image and selection options.
 * @returns Goo vortex manager.
 */
export function createGooVortex(parent: HTMLElement, options: GooVortexOptions = {}): GooVortexManager {
	return new GooVortex(parent, options)
}
