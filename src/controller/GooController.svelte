<script lang="ts">
import { untrack } from 'svelte'
import { createGooController, type GooController, type GooControllerOptions } from './GooController.ts'

type GooControllerProps = GooControllerOptions & {
	element?: GooController | null
}

let host: HTMLDivElement | null = $state(null)
let controller: GooController | null = null
let mounted = false

let {
	object,
	property,
	min,
	max,
	step,
	options,
	type,
	onchange,
	oninput,
	label,
	unit,
	preset,
	presetColor,
	presetHue,
	shape,
	coverage,
	showCoverage,
	disabled,
	className = '',
	controlOptions,
	layout,
	controlTypes,
	element = $bindable<GooController | null>(null)
}: GooControllerProps = $props()

function getOptions(): GooControllerOptions {
	return {
		object,
		property,
		min,
		max,
		step,
		options,
		type,
		label,
		unit,
		preset,
		presetColor,
		presetHue,
		shape,
		coverage,
		showCoverage,
		disabled,
		className,
		controlOptions,
		layout,
		controlTypes,
		onchange,
		oninput
	}
}

function destroyController(): void {
	controller?.destroy()
	controller = null
	element = null
}

function mountController(): void {
	const target = host
	if (!target) return
	destroyController()
	controller = createGooController(getOptions())
	target.replaceChildren(controller)
	element = controller
}

function updateController(nextOptions = getOptions()): void {
	if (!host || !controller) {
		mountController()
		return
	}
	controller.updateOptions(nextOptions)
	element = controller
}

export function refresh(): void {
	controller?.refresh()
}

export function getValue(): unknown {
	return controller?.getValue()
}

export function setValue(value: unknown): void {
	controller?.setValue(value)
}

export function disable(): void {
	controller?.disable()
}

export function enable(): void {
	controller?.enable()
}

$effect(() => {
	if (!host) return
	untrack(mountController)
	mounted = true
	return () => {
		mounted = false
		destroyController()
	}
})

$effect(() => {
	const nextOptions = getOptions()
	if (!mounted) return
	untrack(() => updateController(nextOptions))
})
</script>

<div bind:this={host} style="display: contents"></div>
