/// <reference path="../svelte.d.ts" />

export { default as GooPopout } from './GooPopout.svelte'
export type { GooPopoutAt, GooPopoutInstance, GooPopoutOptions } from './popout.ts'
export { closeAllPopouts, closePopoutsOutside, createGooPopout, getActivePopout, HORIZONTAL, VERTICAL } from './popout.ts'
