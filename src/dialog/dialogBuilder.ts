/**
 * @fileoverview dialogBuilder - DOM construction for GooDialog layouts.
 * @module goobits/dialog/dialogBuilder
 */

import { type CheckboxFieldElement, createCheckboxField } from '../checkbox/_createCheckboxField.ts'
import { createGooField, type GooFieldConfig } from './createGooField.ts'

// ============================================================================
// Types
// ============================================================================

/**
 * Dialog labels.
 */
export interface DialogLabels {
	ok?: string
	cancel?: string
	disregard?: string
	applyToAll?: string
}

/**
 * Dialog field.
 */
export type DialogField = GooFieldConfig & {
	name?: string
	label?: string
}

/**
 * Dialog state.
 */
export interface DialogState {
	type: string
	heading: string
	showClose: boolean
}

/**
 * Dialog elements.
 */
export interface DialogElements {
	$header: HTMLElement | null
	$title: HTMLElement | null
	$content: HTMLElement | null
	$fields: HTMLElement | null
	$footer: HTMLElement | null
	$okBtn: HTMLButtonElement | null
	$cancelBtn: HTMLButtonElement | null
	$disregardBtn: HTMLButtonElement | null
	$closeBtn: HTMLElement | null
	$closeBadge: HTMLElement | null
	$applyToAll: CheckboxFieldElement | null
}

/**
 * Footer elements.
 */
export interface FooterElements {
	$okBtn: HTMLButtonElement | null
	$cancelBtn: HTMLButtonElement | null
	$disregardBtn: HTMLButtonElement | null
	$applyToAll: CheckboxFieldElement | null
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Creates an X icon SVG element (Lucide style).
 */
export function createCloseIcon(): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('width', '16')
	svg.setAttribute('height', '16')
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke', 'currentColor')
	svg.setAttribute('stroke-width', '2')
	svg.setAttribute('stroke-linecap', 'round')
	svg.setAttribute('stroke-linejoin', 'round')
	svg.innerHTML = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
	return svg
}

function createFooterButton(value: string, variant: 'primary' | 'secondary'): HTMLButtonElement {
	const button = document.createElement('button')
	button.className = 'goo-button'
	button.type = 'button'
	button.setAttribute('layout', 'inline')
	button.setAttribute('variant', variant)

	const title = document.createElement('span')
	title.className = 'goo-button__title'
	title.dataset.translate = ''
	title.textContent = value
	button.appendChild(title)

	return button
}

/**
 * Append content to a target element.
 * Handles strings as text. Pass a DOM node for rich markup.
 * @param content - content.
 * @param $target - target.
 */
export function appendContent($target: HTMLElement, content: string | HTMLElement | Node | null | undefined): void {
	if (!content) return

	if (typeof content === 'string') {
		$target.textContent = content
	} else if (content instanceof HTMLElement || content instanceof DocumentFragment) {
		$target.appendChild(content)
	} else if (content instanceof Node) {
		$target.appendChild(content)
	} else {
		console.warn('[GooDialog] Unexpected content type:', typeof content, content)
	}
}

// ============================================================================
// Layout Builders
// ============================================================================

/**
 * Build standard dialog layout (alert, confirm, prompt).
 * @param state - state.
 * @param labels - labels.
 * @param fields - fields.
 * @param content - content.
 * @param $dialog - dialog.
 */
export function buildStandardLayout(
	$dialog: HTMLElement,
	state: DialogState,
	content: string | Node,
	labels: DialogLabels,
	fields: DialogField[]
): DialogElements {
	const { type, heading, showClose } = state

	const elements: DialogElements = {
		$header: null,
		$title: null,
		$content: null,
		$fields: null,
		$footer: null,
		$okBtn: null,
		$cancelBtn: null,
		$disregardBtn: null,
		$closeBtn: null,
		$closeBadge: null,
		$applyToAll: null
	}

	// Determine if we need a close button in the header
	const needsHeaderClose = showClose && type !== 'alert' && type !== 'confirm' && type !== 'prompt'

	// Header (only if heading exists OR we need a close button)
	if (heading || needsHeaderClose) {
		elements.$header = document.createElement('div')
		elements.$header.className = 'goo-dialog__header'

		if (heading) {
			elements.$title = document.createElement('h2')
			elements.$title.className = 'goo-dialog__title'
			elements.$title.textContent = heading
			elements.$header.appendChild(elements.$title)
		}

		if (needsHeaderClose) {
			elements.$closeBtn = document.createElement('button')
			elements.$closeBtn.className = 'goo-dialog__close'
			elements.$closeBtn.appendChild(createCloseIcon())
			elements.$closeBtn.setAttribute('aria-label', 'Close')
			elements.$header.appendChild(elements.$closeBtn)
		}

		$dialog.appendChild(elements.$header)
	}

	// Content
	elements.$content = document.createElement('div')
	elements.$content.className = 'goo-dialog__content'
	appendContent(elements.$content, content)
	$dialog.appendChild(elements.$content)

	// Fields for prompt
	if (type === 'prompt' && fields.length > 0) {
		elements.$fields = document.createElement('div')
		elements.$fields.className = 'goo-dialog__fields'
		elements.$content.appendChild(elements.$fields)
	}

	// Footer for confirm/prompt
	if (type === 'confirm' || type === 'prompt') {
		elements.$footer = document.createElement('div')
		elements.$footer.className = 'goo-dialog__footer'
		$dialog.appendChild(elements.$footer)
	}

	// Alert close badge
	if (type === 'alert' && showClose) {
		elements.$closeBadge = document.createElement('button')
		elements.$closeBadge.className = 'goo-dialog__close-badge'
		elements.$closeBadge.appendChild(createCloseIcon())
		elements.$closeBadge.setAttribute('aria-label', 'Close')
		$dialog.appendChild(elements.$closeBadge)
	}

	return elements
}

/**
 * Build notify dialog layout.
 * @param showClose - show close.
 * @param content - content.
 * @param $dialog - dialog.
 */
export function buildNotifyLayout(
	$dialog: HTMLElement,
	content: string | Node,
	showClose: boolean
): Pick<DialogElements, '$content' | '$closeBtn'> {
	const elements: Pick<DialogElements, '$content' | '$closeBtn'> = {
		$content: null,
		$closeBtn: null
	}

	// Content
	elements.$content = document.createElement('div')
	elements.$content.className = 'goo-dialog__content'
	appendContent(elements.$content, content)
	$dialog.appendChild(elements.$content)

	// Close button
	if (showClose) {
		elements.$closeBtn = document.createElement('button')
		elements.$closeBtn.className = 'goo-dialog__close'
		elements.$closeBtn.appendChild(createCloseIcon())
		elements.$closeBtn.setAttribute('aria-label', 'Close')
		$dialog.appendChild(elements.$closeBtn)
	}

	return elements
}

/**
 * Build overlay dialog layout.
 * @param state - state.
 * @param content - content.
 * @param $dialog - dialog.
 */
export function buildOverlayLayout(
	$dialog: HTMLElement,
	state: DialogState,
	content: string | Node
): Pick<DialogElements, '$header' | '$title' | '$content' | '$closeBtn'> {
	const { heading, showClose } = state

	const elements: Pick<DialogElements, '$header' | '$title' | '$content' | '$closeBtn'> = {
		$header: null,
		$title: null,
		$content: null,
		$closeBtn: null
	}

	// Header
	if (heading || showClose) {
		elements.$header = document.createElement('div')
		elements.$header.className = 'goo-dialog__header'

		if (heading) {
			elements.$title = document.createElement('h2')
			elements.$title.className = 'goo-dialog__title'
			elements.$title.textContent = heading
			elements.$header.appendChild(elements.$title)
		}

		if (showClose) {
			elements.$closeBtn = document.createElement('button')
			elements.$closeBtn.className = 'goo-dialog__close'
			elements.$closeBtn.appendChild(createCloseIcon())
			elements.$closeBtn.setAttribute('aria-label', 'Close')
			elements.$header.appendChild(elements.$closeBtn)
		}

		$dialog.appendChild(elements.$header)
	}

	// Content
	elements.$content = document.createElement('div')
	elements.$content.className = 'goo-dialog__content'
	appendContent(elements.$content, content)
	$dialog.appendChild(elements.$content)

	return elements
}

/**
 * Build dialog fields.
 * Returns a map of field name to field element.
 * @param fields - fields.
 * @param $fieldsContainer - fields container.
 */
export function buildFields(
	$fieldsContainer: HTMLElement,
	fields: DialogField[]
): Map<string, HTMLElement> {
	const fieldElements = new Map<string, HTMLElement>()

	for (const fieldConfig of fields) {
		const $field = document.createElement('div')
		$field.className = 'goo-dialog__field'

		// Create field element using Goo components
		const $element = createGooField(fieldConfig)
		if ($element) {
			// Add label if not built into the component
			const hasBuiltInLabel = ($element as HTMLElement).querySelector?.('label')
			if (fieldConfig.label && !hasBuiltInLabel) {
				const $label = document.createElement('label')
				$label.className = 'goo-dialog__field-label'
				$label.textContent = fieldConfig.label
				$field.appendChild($label)
			}

			$field.appendChild($element as Node)
			$fieldsContainer.appendChild($field)

			// Store reference by name
			if (fieldConfig.name) {
				fieldElements.set(fieldConfig.name, $element as HTMLElement)
			}
		}
	}

	return fieldElements
}

/**
 * Build dialog footer with buttons.
 * @param labels - labels.
 * @param $footer - footer.
 */
export function buildFooter(
	$footer: HTMLElement,
	labels: DialogLabels
): FooterElements {
	const elements: FooterElements = {
		$okBtn: null,
		$cancelBtn: null,
		$disregardBtn: null,
		$applyToAll: null
	}

	// Apply to all checkbox
	if (labels.applyToAll) {
		elements.$applyToAll = createCheckboxField({
			label: labels.applyToAll
		})
		const $applyAllWrap = document.createElement('div')
		$applyAllWrap.className = 'goo-dialog__apply-all'
		$applyAllWrap.appendChild(elements.$applyToAll)
		$footer.appendChild($applyAllWrap)
	}

	// Cancel button
	if (labels.cancel) {
		elements.$cancelBtn = createFooterButton(labels.cancel, 'secondary')
		$footer.appendChild(elements.$cancelBtn)
	}

	// Disregard button
	if (labels.disregard) {
		elements.$disregardBtn = createFooterButton(labels.disregard, 'secondary')
		$footer.appendChild(elements.$disregardBtn)
	}

	// OK button (with attention styling)
	if (labels.ok) {
		elements.$okBtn = createFooterButton(labels.ok, 'primary')
		elements.$okBtn.classList.add('goo-dialog__ok-btn')
		$footer.appendChild(elements.$okBtn)
	}

	return elements
}
