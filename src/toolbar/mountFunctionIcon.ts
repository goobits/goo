export type FunctionIcon = string | (() => HTMLElement)

export type FunctionIconMountOptions = {
	icon?: FunctionIcon
	position?: 'append' | 'prepend'
}

export type FunctionIconMountParameter = FunctionIcon | FunctionIconMountOptions | undefined

export function mountFunctionIcon(
	element: HTMLElement,
	parameter: FunctionIconMountParameter
): { destroy(): void; update(parameter: FunctionIconMountParameter): void } {
	let iconElement: HTMLElement | undefined

	function render(nextParameter: FunctionIconMountParameter): void {
		const { icon, position } = readMountParameter(nextParameter)
		iconElement?.remove()
		iconElement = undefined

		if (typeof icon !== 'function') {
			return
		}

		iconElement = icon()
		if (position === 'prepend') {
			element.insertBefore(iconElement, element.firstChild)
		} else {
			element.append(iconElement)
		}
	}

	render(parameter)

	return {
		update: render,
		destroy() {
			iconElement?.remove()
		}
	}
}

function readMountParameter(parameter: FunctionIconMountParameter): FunctionIconMountOptions {
	if (parameter && typeof parameter === 'object') {
		return {
			icon: parameter.icon,
			position: parameter.position || 'append'
		}
	}

	if (typeof parameter === 'string' || typeof parameter === 'function') {
		return {
			icon: parameter,
			position: 'append'
		}
	}

	return {
		position: 'append'
	}
}
