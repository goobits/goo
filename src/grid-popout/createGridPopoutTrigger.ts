import { flushSync, mount, unmount } from 'svelte'

import { gooTooltipRuntime as UITooltip } from '../tooltip/index.ts'
import GridPopoutPicker from './GridPopoutPicker.svelte'
import type { GridPopoutItem } from './types.ts'

export type GridPopoutTriggerHandle = {
	readonly element: HTMLElement
	destroy(): void
	setItems(items: GridPopoutItem[]): void
	setValue(value: string): void
}

type GridPopoutPickerApi = ReturnType<typeof mount> & {
	getRootElement(): HTMLElement | null
	setItems(items: GridPopoutItem[]): void
	setValue(value: string): void
}

type GridPopoutTooltip = string | (() => string | undefined)

export type GridPopoutTriggerOptions = {
	ariaLabel?: string
	className?: string
	dataParam?: string
	id?: string
	items: GridPopoutItem[]
	onChoose?: (this: GridPopoutTriggerHandle, value: string) => void | Promise<void>
	popoutClassName?: string
	selected?: string
	tooltip?: GridPopoutTooltip
}

/**
 * Creates a mounted grid popout trigger and returns its handle.
 */
export function createGridPopoutTrigger({
	ariaLabel = '',
	className = '',
	dataParam,
	id,
	items,
	onChoose,
	popoutClassName = '',
	selected,
	tooltip
}: GridPopoutTriggerOptions): GridPopoutTriggerHandle {
	const target = document.createElement('div')
	const handleRef: { current?: GridPopoutTriggerHandle } = {}
	const component = mount(GridPopoutPicker, {
		target,
		props: {
			ariaLabel,
			class: className,
			dataParam,
			id,
			items,
			popoutClass: popoutClassName,
			selected,
			onchoose(value: string) {
				if (handleRef.current) {
					void onChoose?.call(handleRef.current, value)
				}
			}
		}
	}) as GridPopoutPickerApi
	let destroyed = false

	flushSync()
	const trigger = component.getRootElement()
	if (!trigger) {
		unmount(component)
		throw new Error('GridPopoutPicker failed to mount.')
	}

	const tooltipHandle = tooltip
		? UITooltip.attach(trigger, () => {
			if (trigger.classList.contains('goo-grid-trigger--opened')) {
				return
			}

			return typeof tooltip === 'function' ? tooltip() : tooltip
		}, {
			direction: 'right',
			showOnClick: true,
			showOnHover: true
		})
		: undefined

	const handle: GridPopoutTriggerHandle = {
		get element() {
			return trigger
		},
		destroy() {
			if (destroyed) return
			destroyed = true
			tooltipHandle?.destroy()
			void unmount(component)
		},
		setItems(nextItems) {
			flushSync(() => component.setItems(nextItems))
		},
		setValue(value) {
			flushSync(() => component.setValue(value))
		}
	}
	handleRef.current = handle

	return handle
}
