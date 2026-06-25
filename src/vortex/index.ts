/// <reference path="../svelte.d.ts" />

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
		this.#remove(options.id)

		// Svelte's mount() does not surface a component's exported functions in its
		// return type, so annotate the imperative handle the component exposes.
		const instance = mount(GooVortexComponent, {
			target: this.#parent,
			props: { message: options.message ?? '', src: this.#getImageUrl() }
		}) as GooVortexComponentHandle

		const item: GooVortexInstance = {
			destroyFrame: null,
			destroyTimer: null,
			enterTimer: null,
			instance,
			time: Date.now()
		}
		this.#running[options.id] = item

		item.enterTimer = window.setTimeout(() => {
			item.enterTimer = null
			if (this.#running[options.id] !== item) return
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
		this.#clearItemTimers(item)

		return new Promise(resolve => {
			item.destroyFrame = window.requestAnimationFrame(() => {
				item.destroyFrame = null
				item.instance.exit()

				item.destroyTimer = window.setTimeout(() => {
					item.destroyTimer = null
					void unmount(item.instance)
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

	#clearItemTimers(item: GooVortexInstance): void {
		if (item.enterTimer !== null) {
			window.clearTimeout(item.enterTimer)
			item.enterTimer = null
		}
		if (item.destroyFrame !== null) {
			window.cancelAnimationFrame(item.destroyFrame)
			item.destroyFrame = null
		}
		if (item.destroyTimer !== null) {
			window.clearTimeout(item.destroyTimer)
			item.destroyTimer = null
		}
	}

	#remove(id: string): void {
		const item = this.#running[id]
		if (!item) return
		delete this.#running[id]
		this.#clearItemTimers(item)
		void unmount(item.instance)
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
