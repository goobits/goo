import { flushSync, mount, unmount } from 'svelte'

import GooButton from './GooButton.svelte'
import type {
	GooButtonLayout,
	GooButtonTarget,
	GooButtonType,
	GooButtonVariant
} from './types.ts'

/** Icon accepted by the imperative button factory. */
export type GooButtonFieldIcon = string | Element | (() => Element)

/** Options for an imperative Goo button. */
export type GooButtonFieldOptions = {
	ariaLabel?: string
	ariaPressed?: boolean | 'false' | 'mixed' | 'true'
	block?: boolean
	class?: string
	className?: string
	disabled?: boolean
	formValue?: string
	fullRow?: boolean
	href?: string
	icon?: GooButtonFieldIcon
	layout?: GooButtonLayout
	onclick?: (event: MouseEvent) => void
	rel?: string
	size?: string
	square?: boolean
	style?: string
	target?: GooButtonTarget
	title?: string
	tooltip?: string
	type?: GooButtonType
	value?: string
	variant?: GooButtonVariant
}

/** Imperative Goo button host. */
export type GooButtonFieldElement = HTMLDivElement & {
	button: HTMLAnchorElement | HTMLButtonElement | null
	click(): void
	destroy(): void
}

/** Create a Goo button for imperative DOM callers. */
export function createButtonField(options: GooButtonFieldOptions = {}): GooButtonFieldElement {
	const field = document.createElement('div') as GooButtonFieldElement
	field.className = 'goo-button-field'
	const instance = mount(GooButton, {
		target: field,
		props: {
			ariaLabel: options.ariaLabel,
			ariaPressed: options.ariaPressed,
			block: options.block,
			class: options.class ?? options.className,
			disabled: options.disabled,
			formValue: options.formValue,
			fullRow: options.fullRow,
			href: options.href,
			layout: options.layout,
			onclick: options.onclick,
			rel: options.rel,
			size: options.size,
			square: options.square,
			style: options.style,
			target: options.target,
			title: options.title,
			tooltip: options.tooltip,
			type: options.type,
			value: options.value,
			variant: options.variant
		}
	})
	flushSync()

	let destroyed = false
	const button = field.querySelector<HTMLAnchorElement | HTMLButtonElement>('.goo-button')
	Object.defineProperty(field, 'button', {
		configurable: true,
		get: () => button
	})
	field.click = () => button?.click()
	field.destroy = () => {
		if (destroyed) return
		destroyed = true
		unmount(instance)
		field.remove()
	}
	appendIcon(button, options.icon)

	return field
}

function appendIcon(
	button: HTMLAnchorElement | HTMLButtonElement | null,
	icon: GooButtonFieldIcon | undefined
): void {
	if (!button || !icon) return

	const iconHost = document.createElement('span')
	iconHost.className = 'goo-button__icon'
	iconHost.setAttribute('aria-hidden', 'true')
	if (typeof icon === 'string') {
		iconHost.classList.add(...icon.split(/\s+/).filter(Boolean))
	} else {
		const iconElement = typeof icon === 'function' ? icon() : icon
		iconHost.appendChild(iconElement)
	}
	button.insertBefore(iconHost, button.firstChild)
}
