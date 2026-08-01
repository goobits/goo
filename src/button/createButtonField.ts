import { flushSync, mount, unmount } from 'svelte'

import GooButton from './GooButton.svelte'
import type {
	GooButtonLayout,
	GooButtonProps,
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
	className?: string
	disabled?: boolean
	formValue?: string
	fullRow?: boolean
	href?: string
	icon?: GooButtonFieldIcon
	label?: string
	layout?: GooButtonLayout
	onclick?: (event: MouseEvent) => void
	rel?: string
	size?: string
	square?: boolean
	style?: string
	target?: GooButtonTarget
	title?: string
	type?: GooButtonType
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
	const sharedProps = {
		ariaLabel: options.ariaLabel,
		ariaPressed: options.ariaPressed,
		class: options.className,
		disabled: options.disabled,
		formValue: options.formValue,
		fullRow: options.fullRow,
		label: options.label,
		layout: options.layout,
		onclick: options.onclick,
		rel: options.rel,
		size: options.size,
		square: options.square,
		style: options.style,
		target: options.target,
		title: options.title,
		type: options.type,
		variant: options.variant
	}
	const props: GooButtonProps =
		options.href === undefined ? sharedProps : { ...sharedProps, href: options.href }
	const instance = mount(GooButton, {
		target: field,
		props
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
