const ALLOWED_ELEMENTS = new Set([
	'A',
	'B',
	'BR',
	'DIV',
	'EM',
	'H1',
	'H2',
	'H3',
	'I',
	'LI',
	'OL',
	'P',
	'SMALL',
	'SPAN',
	'STRONG',
	'U',
	'UL'
])

const SAFE_URL_PATTERN = /^(?:https?:|mailto:|\/(?!\/)|\.\/|\.\.\/|#)/i
const LINE_BREAK_PATTERN = /<br\s*\/?>|\r?\n/gi

/**
 * Create plain dialog content that preserves line breaks.
 *
 * Goo dialogs intentionally render strings as text. Use this helper for
 * translated plain text that may contain newline markers, especially when the
 * translation interpolates user- or document-controlled values.
 *
 * @param content - Plain translated dialog text or an existing DOM node.
 * @returns A DOM node suitable for Goo dialog `content`.
 */
export function createGooDialogTextContent(content: string | Node): Node {
	if (typeof content !== 'string') {
		return content
	}

	const fragment = document.createDocumentFragment()
	const parts = content.split(LINE_BREAK_PATTERN)
	parts.forEach((part, index) => {
		if (index) {
			fragment.appendChild(document.createElement('br'))
		}
		fragment.appendChild(document.createTextNode(part))
	})
	return fragment
}

/**
 * Create explicit rich dialog content from trusted app-owned markup.
 *
 * Goo dialogs intentionally render plain strings as text. Use this helper only
 * for trusted application strings that intentionally include simple markup such
 * as paragraphs, links, emphasis, or line breaks.
 *
 * @param content - Trusted translated dialog markup or an existing DOM node.
 * @returns A DOM node suitable for Goo dialog `content`.
 */
export function createTrustedGooDialogContent(content: string | Node): Node {
	if (typeof content !== 'string') {
		return content
	}

	const template = document.createElement('template')
	template.innerHTML = content
	const fragment = document.createDocumentFragment()
	for (const child of Array.from(template.content.childNodes)) {
		fragment.appendChild(sanitizeDialogNode(child))
	}
	return fragment
}

function sanitizeDialogNode(node: ChildNode): Node {
	if (node.nodeType === Node.TEXT_NODE) {
		return document.createTextNode(node.textContent ?? '')
	}

	if (!(node instanceof Element) || !ALLOWED_ELEMENTS.has(node.tagName)) {
		return document.createTextNode(node.textContent ?? '')
	}

	const element = document.createElement(node.tagName.toLowerCase())
	copySafeAttributes(node, element)
	for (const child of Array.from(node.childNodes)) {
		element.appendChild(sanitizeDialogNode(child))
	}
	return element
}

function copySafeAttributes(source: Element, target: HTMLElement): void {
	for (const attr of Array.from(source.attributes)) {
		const name = attr.name.toLowerCase()
		const value = attr.value
		if (name === 'class' || name === 'title' || name === 'role' || name === 'action' || name.startsWith('aria-') || name.startsWith('data-')) {
			target.setAttribute(name, value)
			continue
		}

		if (source.tagName === 'A' && name === 'href' && SAFE_URL_PATTERN.test(value)) {
			target.setAttribute('href', value)
			continue
		}

		if (source.tagName === 'A' && name === 'target' && value === '_blank') {
			target.setAttribute('target', value)
			target.setAttribute('rel', 'noopener noreferrer')
		}
	}
}
