/** DOM element with an imperative cleanup hook. */
export type GooDisposableElement = HTMLElement & {
	destroy(): void
}

/** DOM element with imperative cleanup and value update hooks. */
export type GooValueElement<TValue> = GooDisposableElement & {
	setValue(value: TValue): void
}
