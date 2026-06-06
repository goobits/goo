/// <reference path="../svelte.d.ts" />

export { default as GooTooltip } from './GooTooltip.svelte'
export {
	gooTooltipRuntime,
	type GooTooltipRuntimeApi,
	type GooTooltipRuntimeOptions,
	type GooTooltipRuntimeState
} from './imperative.ts'
export type {
	GooTooltipActionOptions,
	GooTooltipInstance,
	GooTooltipOptions
} from './tooltip.ts'
export {
	createGooTooltip,
	tooltip
} from './tooltip.ts'
