<script lang="ts">
/**
 * Goo-owned grid picker trigger with a popout list of selectable options.
 */

import { createGooPopout, gooPopoutRuntime, type GooPopoutInstance } from '../popout/index.ts'
import '../preview/GooPreview.css'

import GridPopoutTrigger from './GridPopoutTrigger.svelte'
import './gridPickerSelectedMark.css'
import type { GridPopoutItem, GridPopoutPreview, GridPopoutSvgIcon } from './types.ts'
import { createGridPickerSelectedMark } from './gridPickerSelectedMark.ts'
import {
	handleGridPopoutDocumentKeyboardEvent,
	handleGridPopoutListKeyboardEvent,
	handleGridPopoutTriggerKeyboardEvent
} from './_gridPopoutKeyboard.ts'

const QUICK_REPEAT_TOGGLE_MS = 350

interface Props {
	ariaLabel?: string
	class?: string
	dataParam?: string
	disabled?: boolean
	id?: string
	items?: GridPopoutItem[]
	popoutClass?: string
	selected?: string
	tabIndex?: number
	onchoose?: (id: string) => void
	onrootchange?: (element: HTMLElement | null) => void
}

let {
	ariaLabel = 'Open menu',
	class: className = '',
	dataParam,
	disabled = false,
	id,
	items = [],
	popoutClass = '',
	selected = '',
	tabIndex = 0,
	onchoose,
	onrootchange
}: Props = $props()

let rootElement = $state<HTMLElement | null>(null)
let currentSelectedOverride = $state<string | null>(null)
let lastSelectedProp = $state('')
let opened = $state(false)
let popout: GooPopoutInstance | null = null
let lastPopoutOpenAt = 0
let suppressNextClick = false
let lastOpenContentSignature = ''
let documentKeydownBound = false

const currentSelected = $derived(currentSelectedOverride ?? selected)
const currentItem = $derived(findItem(currentSelected) ?? items[0])

$effect(() => {
	if (lastSelectedProp === selected) return

	lastSelectedProp = selected
	currentSelectedOverride = null
})

$effect(() => {
	onrootchange?.(rootElement)
})

$effect(() => {
	return () => closePopout()
})

$effect(() => {
	const signature = getContentSignature()
	if (!opened) {
		lastOpenContentSignature = ''
		return
	}
	if (lastOpenContentSignature === signature) return

	const content = popout?.element?.querySelector<HTMLElement>('.goo-grid-picker')
	if (!content) return

	renderOptions(content)
	lastOpenContentSignature = signature
})

export function getRootElement(): HTMLElement | null {
	return rootElement
}

export function setValue(nextSelected: string): void {
	currentSelectedOverride = nextSelected
}

export function setItems(nextItems: GridPopoutItem[]): void {
	items = [ ...nextItems ]
}

export function close(): void {
	closePopout()
}

function setRootElement(element: HTMLElement | null): void {
	rootElement = element
}

function findItem(id: string): GridPopoutItem | undefined {
	return items.find(item => item.id === id)
}

function handlePointerDown(event: PointerEvent): void {
	if (event.button !== 0) return

	event.preventDefault()
	event.stopPropagation()
	suppressNextClick = true
	rootElement?.focus({ preventScroll: true })
	togglePopout()
}

function handleClick(event: MouseEvent): void {
	event.preventDefault()
	event.stopPropagation()
	if (suppressNextClick) {
		suppressNextClick = false
		return
	}

	togglePopout()
}

function handleKeydown(event: KeyboardEvent): void {
	handleGridPopoutTriggerKeyboardEvent(event, {
		close: closePopout,
		isOpen: () => opened,
		open: openPopout
	})
}

function togglePopout(): void {
	if (disabled) return

	if (opened) {
		if (performance.now() - lastPopoutOpenAt < QUICK_REPEAT_TOGGLE_MS) {
			return
		}

		closePopout()
		return
	}

	openPopout()
}

function openPopout(): void {
	if (disabled || !rootElement || popout?.element || !items.length) return

	gooPopoutRuntime.closeOutside(rootElement)
	opened = true
	lastPopoutOpenAt = performance.now()

	popout = createGooPopout({
		content: createContent(),
		at: rootElement,
		className: getPopoutClassName(),
		clickToClose: shouldCloseFromPointer,
		initialFocus: 'none',
		onClose() {
			opened = false
		},
		onDestroy() {
			opened = false
			popout = null
			unbindDocumentKeydown()
		},
		onOpen({ element }) {
			focusSelectedOption(element)
		}
	})
	bindDocumentKeydown()
}

function closePopout(): void {
	unbindDocumentKeydown()
	void popout?.close()
}

function bindDocumentKeydown(): void {
	if (documentKeydownBound) return
	documentKeydownBound = true
	document.addEventListener('keydown', handleDocumentKeydown, true)
}

function unbindDocumentKeydown(): void {
	if (!documentKeydownBound) return
	documentKeydownBound = false
	document.removeEventListener('keydown', handleDocumentKeydown, true)
}

function handleDocumentKeydown(event: KeyboardEvent): void {
	handleGridPopoutDocumentKeyboardEvent(event, {
		close: closePopout,
		focusTrigger: () => rootElement?.focus({ preventScroll: true }),
		isOpen: () => opened
	})
}

function getPopoutClassName(): string {
	const oneColumn = items.length < 6 && !hasExplicitGridLayout(popoutClass)
		? 'goo-grid-popout--one-column'
		: ''
	return [ 'goo-grid-popout', popoutClass, oneColumn ].filter(Boolean).join(' ')
}

function hasExplicitGridLayout(className: string): boolean {
	return className.includes('goo-grid-popout--one-column') ||
		className.includes('goo-grid-popout--icon-grid') ||
		className.includes('goo-grid-popout--preset')
}

function createContent(): HTMLElement {
	const content = document.createElement('div')
	content.className = 'goo-grid-picker'
	content.setAttribute('role', 'listbox')
	content.addEventListener('keydown', handlePopoutKeydown)

	renderOptions(content)
	lastOpenContentSignature = getContentSignature()

	return content
}

function renderOptions(content: HTMLElement): void {
	content.replaceChildren(...items.map(item => createOption(item)))
}

function getContentSignature(): string {
	return [
		currentSelected,
		items.map(item => {
			const preview = getItemPreview(item)
			return [
				item.id,
				item.ariaLabel ?? '',
				item.title,
				item.kicker ?? '',
				item.iconClass ?? '',
				item.iconSvg?.viewBox ?? '',
				preview?.src ?? '',
				preview?.alt ?? '',
				preview?.background ?? '',
				preview?.badge ?? '',
				preview?.fit ?? '',
				preview?.hue ?? '',
				preview?.size ?? ''
			].join('\u0001')
		}).join('\u0002')
	].join('\u0003')
}

function createOption(item: GridPopoutItem): HTMLElement {
	const option = document.createElement('div')
	option.className = 'goo-grid-picker__item'
	option.dataset.optionId = item.id
	option.setAttribute('role', 'option')
	option.setAttribute('aria-label', item.ariaLabel ?? item.title)
	option.setAttribute('aria-selected', String(item.id === currentSelected))
	option.tabIndex = 0
	if (item.id === currentSelected) {
		option.classList.add('selected')
		option.appendChild(createGridPickerSelectedMark())
	}

	const title = document.createElement('div')
	title.className = 'goo-grid-picker__item-title'
	if (item.kicker) {
		const kicker = document.createElement('span')
		kicker.className = 'goo-grid-picker__kicker'
		kicker.textContent = item.kicker
		title.appendChild(kicker)
	}
	const titleText = document.createElement('span')
	titleText.className = 'goo-grid-picker__title'
	titleText.textContent = item.title
	title.appendChild(titleText)
	option.appendChild(title)

	const preview = getItemPreview(item)
	if (preview) {
		option.appendChild(createPreviewSurface(preview))
	} else if (item.iconSvg) {
		option.appendChild(createSvgIcon(item.iconSvg))
	} else if (item.iconClass) {
		const icon = document.createElement('span')
		icon.className = `icon ${ item.iconClass }`
		option.appendChild(icon)
	}

	option.addEventListener('click', event => {
		event.preventDefault()
		event.stopPropagation()
		chooseItem(item.id)
	})
	option.addEventListener('pointerenter', () => option.focus({ preventScroll: true }))

	return option
}

function getItemPreview(item: GridPopoutItem): GridPopoutPreview | undefined {
	if (item.preview) return item.preview
	if (!item.previewUrl) return undefined
	return {
		alt: item.previewAlt ?? '',
		background: 'checker',
		fit: 'contain',
		size: 'sm',
		src: item.previewUrl
	}
}

function createPreviewSurface(preview: GridPopoutPreview): HTMLElement {
	const surface = document.createElement('span')
	surface.className = [
		'icon',
		'goo-preview',
		`goo-preview--${ preview.size ?? 'sm' }`,
		`goo-preview--background-${ preview.background ?? 'checker' }`,
		'goo-grid-picker__preview'
	].filter(Boolean).join(' ')
	if (preview.hue) surface.style.setProperty('--goo-preview-tint', preview.hue)
	if (preview.fit) surface.style.setProperty('--goo-preview-fit', preview.fit)

	if (preview.src) {
		const image = document.createElement('img')
		image.className = 'goo-preview__media'
		image.src = preview.src
		image.alt = preview.alt ?? ''
		image.draggable = false
		image.loading = 'lazy'
		surface.appendChild(image)
	}

	if (preview.badge) {
		const badge = document.createElement('span')
		badge.className = 'goo-preview__badge'
		badge.textContent = preview.badge
		surface.appendChild(badge)
	}

	return surface
}

function createSvgIcon(icon: GridPopoutSvgIcon): HTMLElement {
	const wrapper = document.createElement('span')
	wrapper.className = 'icon'

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	if (icon.class) {
		svg.setAttribute('class', icon.class)
	}
	for (const [ name, value ] of Object.entries(icon.attributes ?? {})) {
		svg.setAttribute(name, value)
	}
	svg.setAttribute('viewBox', icon.viewBox)

	for (const elementOptions of icon.elements ?? icon.paths.map(path => ({
		attributes: path.transform
			? { d: path.d, transform: path.transform }
			: { d: path.d },
		tag: 'path' as const
	}))) {
		const element = document.createElementNS('http://www.w3.org/2000/svg', elementOptions.tag)
		for (const [ name, value ] of Object.entries(elementOptions.attributes)) {
			element.setAttribute(name, value)
		}
		svg.appendChild(element)
	}

	wrapper.appendChild(svg)
	return wrapper
}

function handlePopoutKeydown(event: KeyboardEvent): void {
	handleGridPopoutListKeyboardEvent(event, {
		choose: chooseItem,
		close: closePopout,
		focusSibling: focusSiblingOption,
		focusTrigger: () => rootElement?.focus({ preventScroll: true })
	})
}

function focusSiblingOption(option: HTMLElement | null, delta: number): void {
	const options = getOptions()
	const currentIndex = Math.max(0, option ? options.indexOf(option) : -1)
	const nextIndex = (currentIndex + delta + options.length) % options.length
	options[nextIndex]?.focus({ preventScroll: true })
}

function getOptions(): HTMLElement[] {
	return Array.from(popout?.element?.querySelectorAll<HTMLElement>('.goo-grid-picker__item') ?? [])
}

function chooseItem(id: string): void {
	currentSelectedOverride = id
	onchoose?.(id)
	closePopout()
}

function shouldCloseFromPointer(gevent: { originalEvent?: Event }, isInsidePopout: boolean): boolean {
	if (isInsidePopout) return false

	const target = gevent.originalEvent?.target
	return !(target instanceof Element && rootElement?.contains(target))
}

function focusSelectedOption($element: HTMLElement): void {
	const selectedOption = $element.querySelector<HTMLElement>(
		`[data-option-id="${ escapeSelectorValue(currentSelected) }"]`
	)
	selectedOption?.focus({ preventScroll: true })
}

function escapeSelectorValue(value: string): string {
	return globalThis.CSS?.escape
		? globalThis.CSS.escape(value)
		: value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}
</script>

<GridPopoutTrigger
	{ariaLabel}
	class={className}
	{dataParam}
	{disabled}
	{id}
	iconClass={currentItem?.iconClass ?? ''}
	iconSvg={currentItem?.iconSvg}
	kicker={currentItem?.kicker ?? ''}
	{opened}
	preview={currentItem ? getItemPreview(currentItem) : undefined}
	previewAlt={currentItem?.previewAlt ?? currentItem?.title ?? ''}
	previewUrl={currentItem?.previewUrl ?? ''}
	tabIndex={tabIndex}
	title={currentItem?.title ?? ''}
	onpointerdown={handlePointerDown}
	onclick={handleClick}
	onkeydown={handleKeydown}
	onrootchange={setRootElement}
/>

<style>
:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend)),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend)) {
	--goo-grid-picker-icon-grid-inline-size: calc(var(--goo-theme-control-height-lg) * 8);
	--goo-grid-picker-icon-item-min-height: calc(var(--goo-theme-control-height-lg) * 2 + var(--goo-theme-space-xs));
	--goo-grid-picker-item-min-height: calc(
		var(--goo-theme-control-height-lg) + var(--goo-theme-space-xs) + var(--goo-theme-space-2xs)
	);
	--goo-grid-picker-max-inline-size: calc(var(--goo-theme-control-height-lg) * 8);
	--goo-grid-picker-preset-inline-size: calc(var(--goo-theme-control-height-lg) * 13 + var(--goo-theme-space-xl));
	--goo-grid-picker-preset-item-min-height: calc(
		var(--goo-theme-control-height-lg) * 2 + var(--goo-theme-space-xl) + var(--goo-theme-space-xs) +
			var(--goo-theme-space-2xs)
	);
	--goo-grid-picker-small-max-inline-size: calc(var(--goo-theme-control-height-lg) * 6.5);
	--goo-grid-picker-title-gap: calc(var(--goo-theme-space-2xs) * 0.5);
	--goo-grid-picker-viewport-inset: var(--goo-theme-control-height-md);

	max-width: var(--goo-grid-picker-max-inline-size);
	user-select: none;
	-webkit-user-select: none;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) goo-popout-content),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-popout__content) {
	padding: var(--goo-theme-space-sm);
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker) {
	display: grid;
	gap: var(--goo-theme-space-sm);
	grid-template-columns: repeat(2, minmax(0, 1fr));
	justify-items: stretch;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item) {
	align-items: center;
	border: 1px solid transparent;
	border-radius: var(--goo-theme-radius-sm);
	display: flex;
	gap: var(--goo-theme-space-sm);
	justify-content: flex-start;
	min-height: var(--goo-grid-picker-item-min-height);
	padding: var(--goo-theme-space-sm);
	position: relative;
	width: 100%;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item:hover),
:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item:focus-visible),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item:hover),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item:focus-visible) {
	background: color-mix(in srgb, var(--goo-theme-fg) 15%, transparent);
	border-color: var(--goo-theme-border);
	outline: none;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item.selected),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item.selected) {
	background: var(--goo-theme-surface-raised);
	border-color: var(--goo-theme-accent);
	box-shadow: inset 0 0 0 1px var(--goo-theme-accent);
	color: var(--goo-theme-fg);
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item-title),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__item-title) {
	display: flex;
	flex-direction: column;
	gap: var(--goo-grid-picker-title-gap);
	line-height: 1.2;
	order: 2;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__kicker),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker__kicker) {
	color: var(--goo-theme-muted);
	font-size: var(--goo-theme-font-size-xs);
	font-weight: var(--goo-theme-font-weight-semibold);
	letter-spacing: 0;
	text-transform: uppercase;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .icon),
:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) canvas.icon),
:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) img.icon),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .icon),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) canvas.icon),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) img.icon) {
	order: 1;
}

:global(goo-popout.goo-grid-popout--one-column),
:global(.goo-popout.goo-grid-popout--one-column) {
	max-width: var(--goo-grid-picker-small-max-inline-size);
}

:global(goo-popout.goo-grid-popout--one-column goo-popout-content),
:global(.goo-popout.goo-grid-popout--one-column .goo-popout__content) {
	padding: var(--goo-theme-space-sm);
}

:global(goo-popout.goo-grid-popout--one-column .goo-grid-picker),
:global(.goo-popout.goo-grid-popout--one-column .goo-grid-picker) {
	grid-template-columns: minmax(0, 1fr);
}

:global(goo-popout.goo-grid-popout--small),
:global(.goo-popout.goo-grid-popout--small) {
	max-width: var(--goo-grid-picker-small-max-inline-size);
}

:global(goo-popout.goo-grid-popout--small goo-popout-content),
:global(.goo-popout.goo-grid-popout--small .goo-popout__content) {
	padding: var(--goo-theme-space-sm);
}

:global(goo-popout.goo-grid-popout--small .goo-grid-picker),
:global(.goo-popout.goo-grid-popout--small .goo-grid-picker) {
	gap: var(--goo-theme-space-xs);
}

:global(goo-popout.goo-grid-popout--icon-grid),
:global(.goo-popout.goo-grid-popout--icon-grid) {
	inline-size: min(var(--goo-grid-picker-icon-grid-inline-size), calc(100vw - var(--goo-grid-picker-viewport-inset)));
	max-width: none;
}

:global(goo-popout.goo-grid-popout--icon-grid goo-popout-content),
:global(.goo-popout.goo-grid-popout--icon-grid .goo-popout__content) {
	padding: var(--goo-theme-space-sm);
}

:global(goo-popout.goo-grid-popout.goo-grid-popout--icon-grid .goo-grid-picker),
:global(.goo-popout.goo-grid-popout.goo-grid-popout--icon-grid .goo-grid-picker) {
	gap: var(--goo-theme-space-sm);
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

:global(goo-popout.goo-grid-popout--icon-grid .goo-grid-picker__item),
:global(.goo-popout.goo-grid-popout--icon-grid .goo-grid-picker__item) {
	align-items: center;
	flex-direction: column;
	gap: var(--goo-theme-space-xs);
	justify-content: flex-start;
	min-height: var(--goo-grid-picker-icon-item-min-height);
	min-width: 0;
	padding: var(--goo-theme-space-xs);
	text-align: center;
}

:global(goo-popout.goo-grid-popout--icon-grid .goo-grid-picker__item-title),
:global(.goo-popout.goo-grid-popout--icon-grid .goo-grid-picker__item-title) {
	color: var(--goo-theme-muted);
	font-size: var(--goo-theme-font-size-xs);
	line-height: 1.2;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:global(goo-popout.goo-grid-popout--icon-grid .goo-grid-picker__item.selected .goo-grid-picker__item-title),
:global(.goo-popout.goo-grid-popout--icon-grid .goo-grid-picker__item.selected .goo-grid-picker__item-title) {
	color: var(--goo-theme-fg);
}

:global(goo-popout.goo-grid-popout--icon-grid .icon),
:global(goo-popout.goo-grid-popout--icon-grid canvas.icon),
:global(goo-popout.goo-grid-popout--icon-grid img.icon),
:global(.goo-popout.goo-grid-popout--icon-grid .icon),
:global(.goo-popout.goo-grid-popout--icon-grid canvas.icon),
:global(.goo-popout.goo-grid-popout--icon-grid img.icon) {
	align-items: center;
	display: inline-flex;
	flex: 0 0 var(--goo-theme-control-height-lg);
	font-size: var(--goo-theme-icon-lg);
	height: var(--goo-theme-control-height-lg);
	justify-content: center;
	line-height: 1;
	margin: 0;
	width: var(--goo-theme-control-height-lg);
}

:global(goo-popout.goo-grid-popout--icon-grid .icon svg),
:global(.goo-popout.goo-grid-popout--icon-grid .icon svg) {
	height: 1em;
	width: 1em;
}

:global(goo-popout.goo-grid-popout--preset),
:global(.goo-popout.goo-grid-popout--preset) {
	inline-size: min(var(--goo-grid-picker-preset-inline-size), calc(100vw - var(--goo-grid-picker-viewport-inset)));
	max-width: none;
}

:global(goo-popout.goo-grid-popout--preset .goo-grid-picker),
:global(.goo-popout.goo-grid-popout--preset .goo-grid-picker) {
	gap: var(--goo-theme-space-sm);
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

:global(goo-popout.goo-grid-popout--preset .goo-grid-picker__item),
:global(.goo-popout.goo-grid-popout--preset .goo-grid-picker__item) {
	align-items: stretch;
	flex-direction: column;
	min-height: var(--goo-grid-picker-preset-item-min-height);
	padding: var(--goo-theme-space-xs);
}

:global(goo-popout.goo-grid-popout--preset .goo-grid-picker__item-title),
:global(.goo-popout.goo-grid-popout--preset .goo-grid-picker__item-title) {
	max-width: 100%;
	order: 2;
	overflow: hidden;
	text-align: left;
}

:global(goo-popout.goo-grid-popout--preset .goo-grid-picker__preview),
:global(.goo-popout.goo-grid-popout--preset .goo-grid-picker__preview) {
	aspect-ratio: 12 / 5;
	flex: none;
	height: auto;
	margin: 0;
	min-height: auto;
	order: 1;
	padding: 0;
	width: 100%;
}

</style>
