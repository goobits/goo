export { default as GooTooltip } from './GooTooltip.svelte'
export {
	gooTooltipRuntime,
	type GooTooltipRuntimeApi,
	type GooTooltipRuntimeHandle,
	type GooTooltipRuntimeOptions
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
