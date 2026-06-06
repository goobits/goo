import { flushSync, mount, unmount } from 'svelte'

import { GooTooltipRuntime as UITooltip } from '../tooltip/index.ts'
import GridPopoutPicker from './GridPopoutPicker.svelte'
import type { GridPopoutItem } from './types.ts'

export type GridPopoutTriggerElement = HTMLElement & {
	destroy(): void
	setValue(value: string): void
}

type GridPopoutPickerApi = ReturnType<typeof mount> & {
	getRootElement(): HTMLElement | null
	setValue(value: string): void
}

type GridPopoutTooltip = string | (() => string | undefined)

export type GridPopoutTriggerOptions = {
	ariaLabel?: string
	className?: string
	items: GridPopoutItem[]
	onChoose?: (this: HTMLElement, value: string) => void | Promise<void>
	popoutClassName?: string
	selected?: string
	tooltip?: GridPopoutTooltip
}

/**
 * Creates a mounted grid popout trigger and returns its root element.
 */
export function createGridPopoutTrigger({
	ariaLabel = '',
	className = '',
	items,
	onChoose,
	popoutClassName = '',
	selected,
	tooltip
}: GridPopoutTriggerOptions): GridPopoutTriggerElement {
	const target = document.createElement('div')
	const triggerRef: { current: GridPopoutTriggerElement | null } = { current: null }
	const component = mount(GridPopoutPicker, {
		target,
		props: {
			ariaLabel,
			class: className,
			items,
			popoutClass: popoutClassName,
			selected,
			onchoose(value: string) {
				if (triggerRef.current) {
					void onChoose?.call(triggerRef.current, value)
				}
			}
		}
	}) as GridPopoutPickerApi

	flushSync()
	const trigger = component.getRootElement() as GridPopoutTriggerElement | null
	if (!trigger) {
		unmount(component)
		throw new Error('GridPopoutPicker failed to mount.')
	}
	triggerRef.current = trigger

	if (tooltip) {
		UITooltip(trigger, () => {
			if (trigger.classList.contains('goo-grid-trigger--opened')) {
				return
			}

			return typeof tooltip === 'function' ? tooltip() : tooltip
		}, {
			direction: 'right',
			showOnClick: true,
			showOnHover: true
		})
	}

	trigger.destroy = () => unmount(component)
	trigger.setValue = value => component.setValue(value)

	return trigger
}
