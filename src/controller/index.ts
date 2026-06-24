/// <reference path="../svelte.d.ts" />

export type {
	GooBuiltInControlType,
	GooControlFactory,
	GooControlOptionBag,
	GooControlOptions,
	GooControlOptionValue,
	GooControlType,
	GooControlTypeConfig,
	GooControlTypeRegistry,
	GooFactoryControlTypeConfig,
	GooSvelteControlModule,
	GooSvelteControlTypeConfig
} from './controlRegistry.ts'
export {
	defineFactoryControlType,
	defineSvelteControlType
} from './controlRegistry.ts'
export type {
	ControllerOption,
	ControllerOptionValue,
	GooController,
	GooControllerBinding,
	GooControllerChangeDetail,
	GooControllerControlType,
	GooControllerEventDetail,
	GooControllerEventName,
	GooControllerInputDetail,
	GooControllerOptions
} from './GooController.ts'
export {
	createGooController
} from './GooController.ts'
export type { SvelteControlSchema } from './svelteControl.svelte.ts'
