/** Screen position used to center a Goo vortex indicator. */
export type GooVortexPoint = {
	x: number
	y: number
}

/** Options for creating a positioned vortex indicator. */
export type GooVortexCreateOptions = {
	id: string
	message?: string
	point: GooVortexPoint
}

/** Options accepted by the vortex manager's `update` method. */
export type GooVortexUpdateOptions = {
	id: string
	message: string
}

/** Configuration for a Goo vortex manager. */
export type GooVortexOptions = {
	imageUrls?: string[]
	randomize?: boolean
}

/** Public manager returned by `createGooVortex`. */
export type GooVortexManager = {
	/** Remove every active vortex. */
	clear(): Promise<string[]>
	/** Create and display a vortex. */
	create(options: GooVortexCreateOptions): void
	/** Destroy a vortex by id. */
	destroy(id: string): Promise<string>
	/** Whether a vortex id is currently active. */
	has(id: string): boolean
	/** Active vortex ids. */
	ids(): string[]
	/** Update a vortex message. */
	update(idOrOptions: string | GooVortexUpdateOptions, message?: string): void
}

/** Imperative handle exposed by a mounted `GooVortex` component. */
export type GooVortexComponentHandle = {

	/** Center the vortex on a point, then play the entrance animation. 	 * @param point - point.
 */
	enter(point: GooVortexPoint): void

	/** Play the exit animation. */
	exit(): void

	/** Center the vortex around a screen point. 	 * @param point - point.
	 */
	positionAt(point: GooVortexPoint): void

	/** Update the message displayed over the vortex. 	 * @param message - message.
	 */
	setMessage(message: string): void
}

/** Active vortex instance tracked by a Goo vortex manager. */
export type GooVortexInstance = {
	destroyFrame: number | null
	destroyTimer: number | null
	enterTimer: number | null
	instance: GooVortexComponentHandle
	time: number
}
