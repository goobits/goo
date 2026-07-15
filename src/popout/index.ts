/// <reference path="../svelte.d.ts" />

export { default as GooPopout } from './GooPopout.svelte'
export { createGooPopout, gooPopoutRuntime } from './popout.ts'
export type {
	GooPopoutAt,
	GooPopoutInstance,
	GooPopoutManager,
	GooPopoutOptions,
	GooPopoutPointerEvent,
	PopoutKeepWithin
} from './popoutTypes.ts'
