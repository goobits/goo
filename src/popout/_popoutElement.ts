import type { GooPopoutRuntime } from './_popoutRegistry.ts'

export interface PopoutElement extends HTMLElement {
	_factoryControlled?: boolean
	_isGooPopout?: boolean
	_popoutInstance?: GooPopoutRuntime
}

export function createPopoutElement({
	ariaLabel,
	ariaLabelledby,
	ariaDescribedby,
	attributes,
	chromeless,
	className,
	content,
	dataset,
	fullScreen,
	instance,
	role,
	showArrow,
	showBackdrop
}: {
	ariaLabel: string
	ariaLabelledby: string | undefined
	ariaDescribedby: string | undefined
	attributes: Record<string, string | number | boolean | null | undefined> | undefined
	chromeless: boolean
	className: string
	content: Element | Element[] | undefined
	dataset: Record<string, string> | undefined
	fullScreen: boolean
	instance: GooPopoutRuntime
	role: string | null
	showArrow: boolean
	showBackdrop: boolean
}): {
	arrowElement: HTMLElement | null
	backdropElement: HTMLElement | null
	element: PopoutElement
} {
	const element = document.createElement('div') as PopoutElement
	const fullScreenClass = fullScreen ? 'goo-popout--fullscreen' : ''
	const chromelessClass = chromeless ? 'goo-popout--chromeless' : ''
	let arrowElement: HTMLElement | null = null
	let backdropElement: HTMLElement | null = null
	element.className = `goo-popout ${ fullScreenClass } ${ chromelessClass } ${ className }`
		.replace(/\s+/g, ' ')
		.trim()
	element.tabIndex = 0
	if (role) {
		element.setAttribute('role', role)
		if (ariaLabelledby) {
			element.setAttribute('aria-labelledby', ariaLabelledby)
		} else {
			element.setAttribute('aria-label', ariaLabel)
		}
		if (ariaDescribedby) {
			element.setAttribute('aria-describedby', ariaDescribedby)
		}
	}

	if (dataset) {
		Object.assign(element.dataset, dataset)
	}

	if (attributes) {
		for (const [ key, value ] of Object.entries(attributes)) {
			if (value === null || value === undefined || value === false) continue
			element.setAttribute(key, value === true ? '' : String(value))
		}
	}

	element._isGooPopout = true
	element._popoutInstance = instance

	if (showBackdrop) {
		backdropElement = document.createElement('div')
		backdropElement.className = 'goo-popout__backdrop'
		element.appendChild(backdropElement)
	}

	// Chromeless content supplies its own frame, so the panel-colored arrow would be visually orphaned.
	if (showArrow && !chromeless) {
		arrowElement = document.createElement('div')
		arrowElement.className = 'goo-popout__arrow'
		element.appendChild(arrowElement)
	}

	const contentWrapper = document.createElement('div')
	contentWrapper.className = 'goo-popout__content'

	if (content) {
		const contentItems = Array.isArray(content) ? content : [ content ]
		for (const item of contentItems) {
			if (item instanceof HTMLElement && item.dataset.gooPopoutStaged === 'true') {
				item.hidden = false
			}
			contentWrapper.appendChild(item)
		}
	}

	element.appendChild(contentWrapper)

	return {
		arrowElement,
		backdropElement,
		element
	}
}
