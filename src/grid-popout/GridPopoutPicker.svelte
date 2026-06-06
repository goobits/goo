<script lang="ts">
/**
 * Goo-owned grid picker trigger with a popout list of selectable options.
 */

import { closePopoutsOutside, createGooPopout, type GooPopoutInstance } from '../popout/index.ts'

import GridPopoutTrigger from './GridPopoutTrigger.svelte'
import './gridPickerSelectedMark.css'
import type { GridPopoutItem, GridPopoutSvgIcon } from './types.ts'
import { createGridPickerSelectedMark } from './gridPickerSelectedMark.ts'

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

export function getRootElement(): HTMLElement | null {
	return rootElement
}

export function setValue(nextSelected: string): void {
	currentSelectedOverride = nextSelected
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
	if (event.key === 'Escape' || event.key === 'Tab') {
		closePopout()
		return
	}

	if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return

	event.preventDefault()
	event.stopPropagation()
	openPopout()
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

	closePopoutsOutside(rootElement)
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
			document.removeEventListener('keydown', handleDocumentKeydown, true)
		},
		onOpen({ element }) {
			focusSelectedOption(element)
		}
	})
	document.addEventListener('keydown', handleDocumentKeydown, true)
}

function closePopout(): void {
	void popout?.close()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
	if (!opened || event.key !== 'Escape') return

	event.preventDefault()
	event.stopPropagation()
	closePopout()
	rootElement?.focus({ preventScroll: true })
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
		className.includes('goo-grid-popout--subtool')
}

function createContent(): HTMLElement {
	const content = document.createElement('div')
	content.className = 'goo-grid-picker'
	content.setAttribute('role', 'listbox')
	content.addEventListener('keydown', handlePopoutKeydown)

	for (const item of items) {
		content.appendChild(createOption(item))
	}

	return content
}

function createOption(item: GridPopoutItem): HTMLElement {
	const option = document.createElement('sketch-grid-item')
	option.dataset.optionId = item.id
	option.setAttribute('role', 'option')
	option.setAttribute('aria-label', item.ariaLabel ?? item.title)
	option.setAttribute('aria-selected', String(item.id === currentSelected))
	option.tabIndex = 0
	if (item.id === currentSelected) {
		option.classList.add('selected')
		option.appendChild(createGridPickerSelectedMark())
	}

	const title = document.createElement('grid-title')
	title.textContent = item.title
	option.appendChild(title)

	if (item.previewUrl) {
		option.appendChild(createPreviewImage(item))
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

function createPreviewImage(item: GridPopoutItem): HTMLImageElement {
	const image = document.createElement('img')
	image.className = 'icon'
	image.src = item.previewUrl ?? ''
	image.alt = item.previewAlt ?? ''
	image.draggable = false
	image.loading = 'lazy'
	return image
}

function createSvgIcon(icon: GridPopoutSvgIcon): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('class', [ 'icon', icon.class ].filter(Boolean).join(' '))
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

	return svg
}

function handlePopoutKeydown(event: KeyboardEvent): void {
	const option = event.target instanceof Element
		? event.target.closest<HTMLElement>('sketch-grid-item')
		: null

	switch (event.key) {
		case 'Enter':
		case ' ':
			if (!option?.dataset.optionId) return
			event.preventDefault()
			event.stopPropagation()
			chooseItem(option.dataset.optionId)
			break

		case 'Escape':
		case 'Tab':
			closePopout()
			rootElement?.focus({ preventScroll: true })
			break

		case 'ArrowDown':
		case 'ArrowRight':
		case 'ArrowUp':
		case 'ArrowLeft':
			event.preventDefault()
			event.stopPropagation()
			focusSiblingOption(option, getKeyboardDelta(event.key))
			break
	}
}

function getKeyboardDelta(key: string): number {
	if (key === 'ArrowUp') return -1
	if (key === 'ArrowDown') return 1
	const rtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
	return key === 'ArrowLeft'
		? rtl ? 1 : -1
		: rtl ? -1 : 1
}

function focusSiblingOption(option: HTMLElement | null, delta: number): void {
	const options = getOptions()
	const currentIndex = Math.max(0, option ? options.indexOf(option) : -1)
	const nextIndex = (currentIndex + delta + options.length) % options.length
	options[nextIndex]?.focus({ preventScroll: true })
}

function getOptions(): HTMLElement[] {
	return Array.from(popout?.element?.querySelectorAll<HTMLElement>('sketch-grid-item') ?? [])
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
	{opened}
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
	max-width: 320px;
	user-select: none;
	-webkit-user-select: none;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) goo-popout-content),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-popout__content) {
	padding: var(--goo-theme-space-sm, 0.5rem);
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) .goo-grid-picker) {
	display: grid;
	gap: 6px;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	justify-items: stretch;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item) {
	align-items: center;
	border: 1px solid transparent;
	border-radius: var(--goo-theme-radius-sm);
	display: flex;
	gap: 8px;
	justify-content: flex-start;
	min-height: 2.9rem;
	padding: var(--goo-theme-space-sm);
	position: relative;
	width: 100%;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item:hover),
:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item:focus-visible),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item:hover),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item:focus-visible) {
	background: color-mix(in srgb, var(--goo-theme-fg) 15%, transparent);
	border-color: var(--goo-theme-border-subtle, var(--goo-theme-border));
	outline: none;
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item.selected),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) sketch-grid-item.selected) {
	background: var(--goo-theme-surface-raised);
	border-color: var(--goo-theme-accent);
	box-shadow: inset 0 0 0 1px var(--goo-theme-accent);
	color: var(--goo-theme-fg);
}

:global(goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) grid-title),
:global(.goo-popout.goo-grid-popout:not(.goo-grid-popout--blend) grid-title) {
	line-height: 1.2;
	order: 2;
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
	max-width: 260px;
}

:global(goo-popout.goo-grid-popout--one-column goo-popout-content),
:global(.goo-popout.goo-grid-popout--one-column .goo-popout__content) {
	padding: var(--goo-theme-space-sm, 0.5rem);
}

:global(goo-popout.goo-grid-popout--one-column .goo-grid-picker),
:global(.goo-popout.goo-grid-popout--one-column .goo-grid-picker) {
	grid-template-columns: minmax(0, 1fr);
}

:global(goo-popout.goo-grid-popout--small),
:global(.goo-popout.goo-grid-popout--small) {
	max-width: 260px;
}

:global(goo-popout.goo-grid-popout--small goo-popout-content),
:global(.goo-popout.goo-grid-popout--small .goo-popout__content) {
	padding: var(--goo-theme-space-sm, 0.5rem);
}

:global(goo-popout.goo-grid-popout--small .goo-grid-picker),
:global(.goo-popout.goo-grid-popout--small .goo-grid-picker) {
	gap: 4px;
}

:global(goo-popout.goo-grid-popout--icon-grid),
:global(.goo-popout.goo-grid-popout--icon-grid),
:global(goo-popout.goo-grid-popout--subtool),
:global(.goo-popout.goo-grid-popout--subtool) {
	inline-size: min(20rem, calc(100vw - 2rem));
	max-width: none;
}

:global(goo-popout.goo-grid-popout--icon-grid goo-popout-content),
:global(.goo-popout.goo-grid-popout--icon-grid .goo-popout__content),
:global(goo-popout.goo-grid-popout--subtool goo-popout-content),
:global(.goo-popout.goo-grid-popout--subtool .goo-popout__content) {
	padding: var(--goo-theme-space-sm);
}

:global(goo-popout.goo-grid-popout.goo-grid-popout--icon-grid .goo-grid-picker),
:global(.goo-popout.goo-grid-popout.goo-grid-popout--icon-grid .goo-grid-picker),
:global(goo-popout.goo-grid-popout.goo-grid-popout--subtool .goo-grid-picker),
:global(.goo-popout.goo-grid-popout.goo-grid-popout--subtool .goo-grid-picker) {
	gap: var(--goo-theme-space-sm);
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

:global(goo-popout.goo-grid-popout--icon-grid sketch-grid-item),
:global(.goo-popout.goo-grid-popout--icon-grid sketch-grid-item),
:global(goo-popout.goo-grid-popout--subtool sketch-grid-item),
:global(.goo-popout.goo-grid-popout--subtool sketch-grid-item) {
	align-items: center;
	flex-direction: column;
	gap: var(--goo-theme-space-xs);
	justify-content: flex-start;
	min-height: 5.25rem;
	min-width: 0;
	padding: var(--goo-theme-space-xs);
	text-align: center;
}

:global(goo-popout.goo-grid-popout--icon-grid grid-title),
:global(.goo-popout.goo-grid-popout--icon-grid grid-title),
:global(goo-popout.goo-grid-popout--subtool grid-title),
:global(.goo-popout.goo-grid-popout--subtool grid-title) {
	color: var(--goo-theme-muted);
	font-size: var(--goo-theme-font-size-xs);
	line-height: 1.2;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:global(goo-popout.goo-grid-popout--icon-grid sketch-grid-item.selected grid-title),
:global(.goo-popout.goo-grid-popout--icon-grid sketch-grid-item.selected grid-title),
:global(goo-popout.goo-grid-popout--subtool sketch-grid-item.selected grid-title),
:global(.goo-popout.goo-grid-popout--subtool sketch-grid-item.selected grid-title) {
	color: var(--goo-theme-fg);
}

:global(goo-popout.goo-grid-popout--icon-grid .icon),
:global(goo-popout.goo-grid-popout--icon-grid canvas.icon),
:global(goo-popout.goo-grid-popout--icon-grid img.icon),
:global(.goo-popout.goo-grid-popout--icon-grid .icon),
:global(.goo-popout.goo-grid-popout--icon-grid canvas.icon),
:global(.goo-popout.goo-grid-popout--icon-grid img.icon),
:global(goo-popout.goo-grid-popout--subtool .icon),
:global(goo-popout.goo-grid-popout--subtool canvas.icon),
:global(goo-popout.goo-grid-popout--subtool img.icon),
:global(.goo-popout.goo-grid-popout--subtool .icon),
:global(.goo-popout.goo-grid-popout--subtool canvas.icon),
:global(.goo-popout.goo-grid-popout--subtool img.icon) {
	align-items: center;
	display: inline-flex;
	flex: 0 0 40px;
	font-size: 40px;
	height: 40px;
	justify-content: center;
	line-height: 1;
	margin: 0;
	width: 40px;
}

</style>
