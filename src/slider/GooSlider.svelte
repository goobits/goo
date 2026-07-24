<script module lang="ts">
	import type { SvelteControlSchema } from '../controller/SvelteControl.svelte.ts'

	/** GooController binding metadata for the Svelte slider component. */
	export const controlSchema: SvelteControlSchema = {
		propMapping: {
			canCross: 'canCross',
			canPush: 'canPush',
			coverage: 'coverage',
			variance: 'variance',
			direction: 'direction',
			ariaLabel: 'ariaLabel',
			label: 'label',
			marks: 'marks',
			max: 'max',
			maxDistance: 'maxDistance',
			min: 'min',
			minDistance: 'minDistance',
			mode: 'mode',
			name: 'name',
			preset: 'preset',
			presetColor: 'presetColor',
			presetHue: 'presetHue',
			presetSaturation: 'presetSaturation',
			scale: 'scale',
			scalePower: 'scalePower',
			shape: 'shape',
			snap: 'snap',
			step: 'step',
			ticks: 'ticks',
			unit: 'unit',
			valueBubble: 'valueBubble'
		}
	}
</script>

<script lang="ts">
	import './GooSlider.css'

	import { onDestroy } from 'svelte'

	import { formatNumber } from '../support/utils/formatNumber.ts'
	import { containKeyboardEvent } from '../support/keyboard/_keyboardActivation.ts'
	import { clamp } from '../support/utils/numberUtils.ts'
	import {
		createPointerDrag,
		type GooPointerDragEvent,
		type GooPointerDragHandle
	} from '../support/utils/pointerDrag.ts'
	import {
		getConstrainedSliderValues,
		getNearestSliderThumbIndex,
		getSliderCoverageStyles,
		getSliderPointerPercent,
		getSliderPositionStyle,
		getVarianceValues as getSharedVarianceValues,
		normalizeSliderMarks,
		parseFloatArray,
		snapSliderValue,
		toFormattedValue,
		toScaledPercent
	} from './sliderUtils.ts'
	import { sliderPresetConfigs, sliderShapes } from './sliderPresets.ts'
	import type {
		GooSliderDirection,
		GooSliderElement,
		GooSliderEventData,
		GooSliderProps,
		GooSliderScale,
		GooSliderThumb,
		GooSliderValue
	} from './types.ts'

	type SliderRuntimeState = {
		direction: GooSliderDirection
		max: number
		min: number
		scale: GooSliderScale
		scalePower: number
		step: number
		unit: string
	}

	let sliderRoot: HTMLDivElement | undefined = $state()
	// The root <div> is augmented with the GooSlider API at runtime (assignSliderApi),
	// so expose it under the augmented type while binding to the real element type.
	const sliderElement = $derived(sliderRoot as GooSliderElement | undefined)
	let trackElement: HTMLDivElement | undefined = $state()
	let thumbElements: HTMLElement[] = $state([])
	let currentValues: number[] = $state([50])
	let activeIndex: number | null = $state(null)
	let activePointerId: number | null = $state(null)
	let zIndex = $state(0)
	let animate = $state(false)
	let animateTimer: ReturnType<typeof setTimeout> | undefined
	let snapAnimate = $state(false)
	let snapAnimateTimer: ReturnType<typeof setTimeout> | undefined
	let pointerDragHandle: GooPointerDragHandle | null = null
	let currentPresetColor = $state('')
	let currentPresetHue = $state(0)
	let currentPresetSaturation = $state(100)
	let currentGradient: string[] | undefined = $state()
	let effectiveDisabled = $state(false)

	let {
		value = $bindable<GooSliderValue>(50),
		min = 0,
		max = 100,
		step = 1,
		unit = 'float',
		label = '',
		ariaLabel,
		title,
		name,
		direction = 'horizontal',
		mode,
		preset,
		presetColor = '',
		presetHue = 0,
		presetSaturation = 100,
		shape = 'default',
		canCross = false,
		canPush = false,
		coverage = false,
		variance = false,
		ticks,
		marks,
		snap,
		scale = 'linear',
		scalePower = 2,
		minDistance,
		maxDistance,
		valueBubble = false,
		disabled = false,
		gradient,
		class: className = '',
		style,
		tabIndex = 0,
		easingFn,
		easingFnInvert,
		children,
		element = $bindable<GooSliderElement | null>(null),
		onchange,
		oninput,
		...rest
	}: GooSliderProps = $props()

	const numericMin = $derived(toFiniteNumber(min, 0))
	const numericMax = $derived(toFiniteNumber(max, 100))
	const numericStep = $derived(toPositiveNumber(step, 1))
	const runtimeState = $derived<SliderRuntimeState>({
		direction,
		max: numericMax,
		min: numericMin,
		scale,
		scalePower,
		step: numericStep,
		unit
	})
	const effectiveMode = $derived(
		mode ?? (variance ? 'variance' : currentValues.length > 1 ? 'range' : 'value')
	)
	const isVarianceMode = $derived(effectiveMode === 'variance')
	const sliderMarks = $derived(normalizeSliderMarks(ticks, marks, numericMin, numericMax))
	const hiddenValue = $derived(formatSliderValue(currentValues))
	const ariaValueNow = $derived(currentValues[0] ?? numericMin)
	const ariaValueText = $derived(thumbValueText(ariaValueNow))

	// Multi-thumb sliders expose one role="slider" per thumb so each thumb is
	// focusable and keyboard-movable; single-thumb sliders keep role="slider" on
	// the root, which stays the single focus/keyboard target.
	const isMulti = $derived(currentValues.length > 1)

	function thumbValueText(value: number): string {
		return String(
			formatNumber(value, unit, {
				min: numericMin,
				max: numericMax,
				step: numericStep,
				appendFormatSuffix: true
			})
		)
	}
	const sliderValue = $derived(getValue())

	const classes = $derived.by(() => {
		const values = ['goo-slider']
		const hasCustomGradient = Boolean(currentGradient?.length || gradient?.length)
		const usesDefaultShape = !shape || shape === 'default'
		if (direction === 'vertical') values.push('goo-slider--vertical')
		if (coverage) values.push('goo-slider--coverage')
		if (isVarianceMode) values.push('goo-slider--variance')
		if (sliderMarks.length) values.push('goo-slider--marked')
		if (valueBubble) values.push('goo-slider--value-bubble')
		if (valueBubble === 'always') values.push('goo-slider--value-bubble-always')
		if (
			!coverage &&
			currentValues.length === 1 &&
			(!preset || preset === 'bipolar') &&
			usesDefaultShape &&
			!hasCustomGradient
		)
			values.push('goo-slider--value-fill')
		if (effectiveDisabled) values.push('goo-slider--disabled')
		if (preset && sliderPresetConfigs[preset]?.className)
			values.push(sliderPresetConfigs[preset].className)
		if (shape && shape !== 'default')
			values.push(
				sliderShapes[shape as keyof typeof sliderShapes]?.className ?? 'goo-slider--wedge'
			)
		if (animate) values.push('goo-slider--animate')
		if (snapAnimate) values.push('goo-slider--snap-animate')
		if (activeIndex !== null) values.push('goo-slider--active')
		if (className) values.push(className)
		return values.filter(Boolean).join(' ')
	})

	const rootStyle = $derived.by(() => {
		const declarations = [style].filter(Boolean) as string[]
		if (preset === 'bipolar' && numericMax > numericMin) {
			const zero = Math.min(
				100,
				Math.max(0, ((0 - numericMin) / (numericMax - numericMin)) * 100)
			)
			declarations.push(`--goo-slider-fill-origin: ${zero}%`)
		}
		if (preset === 'opacity' && currentPresetColor)
			declarations.push(`--goo-slider-opacity-color: ${currentPresetColor}`)
		if ((preset === 'saturation' || preset === 'lightness') && currentPresetHue !== undefined)
			declarations.push(`--goo-slider-hue: ${currentPresetHue}`)
		if (preset === 'lightness' && currentPresetSaturation !== undefined)
			declarations.push(`--goo-slider-saturation: ${currentPresetSaturation}%`)
		if (currentValues.length === 1) {
			const valuePct = `${getDisplayPercent(currentValues[0] ?? numericMin) * 100}%`
			declarations.push(`--goo-slider-value-pct: ${valuePct}`)
			declarations.push(`--goo-slider-fill-pct: ${valuePct}`)
		}
		return declarations.join('; ')
	})

	const trackStyle = $derived.by(() => {
		if (preset) return undefined
		const colors = currentGradient?.length ? currentGradient : gradient
		return colors?.length
			? `background: linear-gradient(to right, ${colors.join(', ')});`
			: undefined
	})

	// Custom host attributes (CSS / external-query hooks) spread so svelte-check
	// does not reject them as unknown attributes on a <div>.
	const hostAttributes = $derived<Record<string, string | number | undefined>>({
		value: hiddenValue,
		min: numericMin,
		max: numericMax,
		step: numericStep,
		unit,
		mode: effectiveMode,
		preset: preset || undefined,
		'preset-color': currentPresetColor || undefined,
		'preset-hue': currentPresetHue,
		shape: shape !== 'default' ? shape : undefined,
		'can-cross': canCross ? '' : undefined,
		'can-push': canPush ? '' : undefined,
		coverage: coverage ? '' : undefined,
		variance: isVarianceMode ? '' : undefined,
		scale: scale !== 'linear' ? scale : undefined,
		'scale-power': scale === 'power' ? scalePower : undefined,
		ticks: ticks ? '' : undefined,
		disabled: effectiveDisabled ? '' : undefined
	})

	$effect(() => {
		const nextValues = normalizeValueArray(value, numericMin)
		if (!areNumberArraysEqual(currentValues, nextValues)) {
			currentValues = nextValues
		}
	})

	$effect(() => {
		currentPresetColor = presetColor
	})

	$effect(() => {
		currentPresetHue = presetHue
	})

	$effect(() => {
		currentPresetSaturation = presetSaturation
	})

	$effect(() => {
		currentGradient = gradient
	})

	$effect(() => {
		effectiveDisabled = Boolean(disabled)
	})

	$effect(() => {
		if (!sliderElement) {
			element = null
			return
		}

		assignSliderApi(sliderElement)
		element = sliderElement
	})

	$effect(() => {
		const target = sliderElement
		if (!target) return
		pointerDragHandle?.detach()
		pointerDragHandle = createPointerDrag(target, handlePointerDrag)
		return () => {
			pointerDragHandle?.detach()
			pointerDragHandle = null
		}
	})

	onDestroy(() => {
		cleanupSliderRuntime()
		element = null
	})

	export function setValue(
		nextValue: GooSliderValue,
		{ silent = true }: { silent?: boolean } = {}
	): void {
		const nextValues = normalizeValueArray(nextValue, numericMin)
		const didChange = !areNumberArraysEqual(currentValues, nextValues)
		if (didChange) {
			currentValues = nextValues
		}
		const nextSliderValue = valuesToSliderValue(nextValues, numericMin)
		if (!areSliderValuesEqual(value, nextSliderValue)) {
			value = nextSliderValue
		}
		if (!silent && didChange) {
			emitSliderEvent(0, 'change')
		}
	}

	export function getValue(): number | number[] {
		return valuesToSliderValue(currentValues, numericMin)
	}

	function assignSliderApi(slider: GooSliderElement): void {
		Object.defineProperties(slider, {
			value: {
				configurable: true,
				get: () => getValue(),
				set: (nextValue) => setValue(nextValue, { silent: true })
			},
			values: {
				configurable: true,
				get: () => currentValues.slice()
			},
			thumbs: {
				configurable: true,
				get: () => currentValues.map((thumbValue, index) => getThumb(index, thumbValue))
			}
		})

		slider.setValue = (nextValue, { silent = false } = {}) => setValue(nextValue, { silent })
		slider.getValue = () => getValue()
		slider.setPresetColor = (color) => {
			currentPresetColor = color
		}
		slider.setPresetHue = (hue) => {
			currentPresetHue = hue
		}
		slider.setPresetSaturation = (saturation) => {
			currentPresetSaturation = saturation
		}
		slider.setGradient = (colors) => {
			currentGradient = colors
		}
		slider.toPercent = (nextValue) => toScaledPercent(
			nextValue,
			numericMin,
			numericMax,
			scale,
			scalePower
		)
		slider.enable = () => {
			effectiveDisabled = false
		}
		slider.disable = () => {
			effectiveDisabled = true
		}
	}

	function handlePointerDrag(event: GooPointerDragEvent): void | false {
		event.preventDefault()

		if (event.START) {
			if (effectiveDisabled || !sliderElement) return false
			const targetIndex = getThumbTargetIndex(event.originalEvent.target)
			const startedOnThumb = targetIndex !== null
			const index = targetIndex ?? findNearestThumbIndex(event.originalEvent)
			if (index === null) return false
			if (!startedOnThumb) {
				playPointerJumpAnimation()
			}
			activeIndex = index
			activePointerId = event.pointerId
			thumbElements[index]?.style.setProperty('z-index', String(++zIndex))
			updateThumbFromPointer(index, event.originalEvent, 'input')
			return
		}

		if (activeIndex === null || activePointerId !== event.pointerId) return

		if (event.CHANGE) {
			if (!effectiveDisabled) {
				if (animate) stopPointerJumpAnimation()
				updateThumbFromPointer(activeIndex, event.originalEvent, 'input')
			}
			return
		}

		const index = activeIndex
		clearActivePointer()
		if (!event.CANCEL) {
			emitSliderEvent(index, 'change', event.originalEvent)
		}
	}

	function keyToNextValue(currentValue: number, event: KeyboardEvent): number | null {
		if (event.key === 'ArrowRight' && direction !== 'vertical') return currentValue + numericStep
		if (event.key === 'ArrowLeft' && direction !== 'vertical') return currentValue - numericStep
		if (event.key === 'ArrowUp') return currentValue + numericStep
		if (event.key === 'ArrowDown') return currentValue - numericStep
		if (event.key === 'Home') return numericMin
		if (event.key === 'End') return numericMax
		return null
	}

	/** Move a specific thumb via keyboard. The root drives thumb 0 for single-thumb
	 *  sliders; each thumb drives itself for multi-thumb sliders. */
	function moveThumbByKey(index: number, event: KeyboardEvent): void {
		if (effectiveDisabled || !currentValues.length) return
		const nextValue = keyToNextValue(currentValues[index] ?? numericMin, event)
		if (nextValue === null) return

		containKeyboardEvent(event)
		updateThumbValue(index, nextValue, 'change', event)
	}

	function handleKeydown(event: KeyboardEvent): void {
		moveThumbByKey(0, event)
	}

	function updateThumbFromPointer(
		index: number,
		event: PointerEvent,
		state: 'change' | 'input'
	): void {
		const pct = getPointerPercent(event)
		const easedPct = easingFnInvert ? easingFnInvert(pct) : pct
		const nextValue = toFormattedValue(easedPct, true, runtimeState)
		updateThumbValue(index, nextValue, state, event)
	}

	function updateThumbValue(
		index: number,
		nextValue: number,
		state: 'change' | 'input',
		event?: Event
	): void {
		const unsnapped = formatValue(nextValue, { snapValue: false })
		let formatted = formatValue(nextValue)

		const values = isVarianceMode
			? getSharedVarianceValues(currentValues, index, formatted, {
					min: numericMin,
					max: numericMax,
					formatValue
				})
			: getConstrainedSliderValues(currentValues, index, formatted, {
					canCross,
					canPush,
					formatValue,
					maxDistance: toFiniteNumber(maxDistance, Number.POSITIVE_INFINITY),
					min: numericMin,
					minDistance: toFiniteNumber(minDistance, 0)
				})

		if (
			values.length === currentValues.length &&
			values.every((value, valueIndex) => Object.is(value, currentValues[valueIndex]))
		) {
			return
		}

		if (state === 'input' && activePointerId !== null && !Object.is(unsnapped, formatted)) {
			playSnapAnimation()
		}

		currentValues = values
		value = getValue()
		emitSliderEvent(index, state, event)
	}

	function emitSliderEvent(index: number, state: 'change' | 'input', event?: Event): void {
		if (!sliderElement) return

		const value = currentValues[index] ?? currentValues[0] ?? numericMin
		const thumb = getThumb(index, value)
		const data: GooSliderEventData = {
			slider: sliderElement,
			state,
			thumb,
			index,
			value,
			event
		}

		if (state === 'input') {
			oninput?.(getValue(), data)
		} else {
			onchange?.(getValue(), data)
		}
		sliderElement.dispatchEvent(new CustomEvent(state, { detail: data, bubbles: true }))
	}

	function findNearestThumbIndex(event: PointerEvent): number | null {
		return getNearestSliderThumbIndex(
			currentValues,
			getPointerPercent(event),
			numericMin,
			numericMax,
			scale,
			scalePower
		)
	}

	function getPointerPercent(event: PointerEvent): number {
		if (!trackElement) return 0

		return getSliderPointerPercent(event, trackElement.getBoundingClientRect(), direction)
	}

	function getThumbTargetIndex(target: EventTarget | null): number | null {
		if (!(target instanceof Element)) return null
		const thumb = target.closest<HTMLElement>('.goo-slider__thumb')
		const index = Number(thumb?.dataset.index)
		return Number.isInteger(index) && index >= 0 && index < currentValues.length ? index : null
	}

	function playPointerJumpAnimation(): void {
		clearTimeout(animateTimer)
		animate = true
		animateTimer = setTimeout(() => {
			animate = false
			animateTimer = undefined
		}, 220)
	}

	function stopPointerJumpAnimation(): void {
		clearTimeout(animateTimer)
		animate = false
		animateTimer = undefined
	}

	function playSnapAnimation(): void {
		clearTimeout(snapAnimateTimer)
		snapAnimate = true
		snapAnimateTimer = setTimeout(() => {
			snapAnimate = false
			snapAnimateTimer = undefined
		}, 140)
	}

	function stopSnapAnimation(): void {
		clearTimeout(snapAnimateTimer)
		snapAnimate = false
		snapAnimateTimer = undefined
	}

	function clearActivePointer(): void {
		activeIndex = null
		activePointerId = null
	}

	function cleanupSliderRuntime(): void {
		pointerDragHandle?.detach()
		pointerDragHandle = null
		clearActivePointer()
		stopPointerJumpAnimation()
		stopSnapAnimation()
	}

	function getThumb(index: number, value: number): GooSliderThumb {
		const pct = getDisplayPercent(value)
		return {
			element: thumbElements[index] ?? sliderElement!,
			index,
			left: pct * getTrackLength(),
			value
		}
	}

	function getTrackLength(): number {
		const rect = trackElement?.getBoundingClientRect()
		return direction === 'vertical' ? rect?.height || 214 : rect?.width || 214
	}

	function getDisplayPercent(nextValue: number): number {
		const pct = toScaledPercent(nextValue, numericMin, numericMax, scale, scalePower)
		return clamp(easingFn ? easingFn(pct) : pct, 0, 1)
	}

	function getThumbStyle(nextValue: number): string {
		return getSliderPositionStyle(nextValue, direction, getDisplayPercent)
	}

	function getMarkStyle(nextValue: number): string {
		return getSliderPositionStyle(nextValue, direction, getDisplayPercent)
	}

	function isVarianceThumb(index: number): boolean {
		return isVarianceMode && currentValues.length >= 3 && index >= 0 && index <= 2
	}

	function getVarianceThumbRole(index: number): 'base' | 'variance' | undefined {
		if (!isVarianceThumb(index)) return undefined
		return index === 1 ? 'base' : 'variance'
	}

	function getVarianceThumbSide(index: number): 'low' | 'base' | 'high' | undefined {
		if (!isVarianceThumb(index)) return undefined
		if (index === 0) return 'low'
		if (index === 1) return 'base'
		return 'high'
	}

	function getThumbAriaLabel(index: number): string {
		const baseLabel = ariaLabel || label || title || 'Value'
		const side = getVarianceThumbSide(index)
		return side ? `${baseLabel} ${side}` : `${baseLabel} ${index + 1}`
	}

	function getCoverageStyles(): string[] {
		return getSliderCoverageStyles({
			coverage,
			direction,
			getDisplayPercent,
			isVarianceMode,
			min: numericMin,
			values: currentValues
		})
	}

	function formatValue(
		nextValue: number | string,
		{ snapValue = true }: { snapValue?: boolean } = {}
	): number {
		const formatted = clamp(
			toFormattedValue(toFiniteNumber(nextValue, numericMin), false, runtimeState),
			numericMin,
			numericMax
		)
		const nextFormatted = snapValue ? snapSliderValue(formatted, snap, sliderMarks) : formatted
		return clamp(nextFormatted, numericMin, numericMax)
	}

	function normalizeValueArray(nextValue: GooSliderValue | undefined, fallback = 50): number[] {
		if (nextValue === undefined || nextValue === null) return [fallback]
		if (typeof nextValue === 'object' && !Array.isArray(nextValue)) {
			const range = nextValue as { min?: unknown; max?: unknown }
			return [toFiniteNumber(range.min, numericMin), toFiniteNumber(range.max, numericMax)].map(
				(value) => formatValue(value)
			)
		}
		const values = parseFloatArray(nextValue)
		return values.length ? values.map((value) => formatValue(value)) : [fallback]
	}

	function valuesToSliderValue(values: number[], fallback: number): number | number[] {
		return values.length > 1 ? values.slice() : (values[0] ?? fallback)
	}

	function areNumberArraysEqual(left: number[], right: number[]): boolean {
		return (
			left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
		)
	}

	function areSliderValuesEqual(
		left: GooSliderValue | undefined,
		right: number | number[]
	): boolean {
		return areNumberArraysEqual(
			normalizeValueArray(left, numericMin),
			normalizeValueArray(right, numericMin)
		)
	}

	function formatSliderValue(rawValue: number[]): string {
		return rawValue.join(',')
	}

	function toFiniteNumber(nextValue: unknown, fallback: number): number {
		const numericValue = Number(nextValue)
		return Number.isFinite(numericValue) ? numericValue : fallback
	}

	function toPositiveNumber(nextValue: unknown, fallback: number): number {
		const numericValue = Number(nextValue)
		return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	{...rest}
	bind:this={sliderRoot}
	class={classes}
	role={isMulti ? 'group' : 'slider'}
	aria-valuemin={isMulti ? undefined : numericMin}
	aria-valuemax={isMulti ? undefined : numericMax}
	aria-valuenow={isMulti ? undefined : ariaValueNow}
	aria-valuetext={isMulti ? undefined : ariaValueText}
	aria-orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
	aria-label={ariaLabel || label || title || undefined}
	title={title || label || undefined}
	tabindex={isMulti ? undefined : tabIndex}
	draggable="false"
	style={rootStyle || undefined}
	onkeydowncapture={isMulti ? undefined : handleKeydown}
	{...hostAttributes}
	aria-disabled={effectiveDisabled ? 'true' : undefined}
>
	<div bind:this={trackElement} class="goo-slider__track" style={trackStyle}>
		{#each sliderMarks as mark}
			<div
				class="goo-slider__mark"
				class:goo-slider__mark--labeled={mark.label}
				style={getMarkStyle(mark.value)}
			>
				{#if mark.label}
					<span class="goo-slider__mark-label">{mark.label}</span>
				{/if}
			</div>
		{/each}
		{#each getCoverageStyles() as coverageStyle}
			<div class="goo-slider__coverage" style={coverageStyle}></div>
		{/each}
		{#each currentValues as thumbValue, index}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				bind:this={thumbElements[index]}
				class="goo-slider__thumb"
				class:goo-slider__thumb--active={activeIndex === index}
				class:goo-slider__thumb--variance-base={getVarianceThumbRole(index) === 'base'}
				class:goo-slider__thumb--variance-control={getVarianceThumbRole(index) === 'variance'}
				class:goo-slider__thumb--variance-low={getVarianceThumbSide(index) === 'low'}
				class:goo-slider__thumb--variance-high={getVarianceThumbSide(index) === 'high'}
				data-index={index}
				data-role={getVarianceThumbRole(index)}
				data-side={getVarianceThumbSide(index)}
				style={getThumbStyle(thumbValue)}
				role={isMulti ? 'slider' : undefined}
				tabindex={isMulti && !effectiveDisabled ? tabIndex : undefined}
				aria-valuemin={isMulti ? numericMin : undefined}
				aria-valuemax={isMulti ? numericMax : undefined}
				aria-valuenow={isMulti ? thumbValue : undefined}
				aria-valuetext={isMulti ? thumbValueText(thumbValue) : undefined}
				aria-orientation={isMulti
					? direction === 'vertical'
						? 'vertical'
						: 'horizontal'
					: undefined}
				aria-label={isMulti ? getThumbAriaLabel(index) : undefined}
				aria-disabled={isMulti && effectiveDisabled ? 'true' : undefined}
				onkeydowncapture={isMulti ? (event) => moveThumbByKey(index, event) : undefined}
			>
				{#if valueBubble}
					<span class="goo-slider__value-bubble">{thumbValueText(thumbValue)}</span>
				{/if}
			</div>
		{/each}
	</div>
	{#if children}
		{@render children()}
	{/if}
	{#if name}
		<input
			type="hidden"
			data-goo-slider-input
			{name}
			value={sliderValue}
			disabled={effectiveDisabled}
		/>
	{/if}
</div>
