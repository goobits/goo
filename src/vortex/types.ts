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

/** Imperative handle exposed by a mounted `GooVortex` component. */
export type GooVortexHandle = {

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
export type GooVortexItem = {
	instance: GooVortexHandle
	time: number
}
