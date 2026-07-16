import type { GooPopoutInstance } from './popoutTypes.ts'

export type GooPopoutRuntime = GooPopoutInstance & {
	parent: GooPopoutRuntime | null
	readonly children: Set<GooPopoutRuntime>
}

const activePopouts = new Set<GooPopoutRuntime>()

export function registerActivePopout(popout: GooPopoutRuntime): void {
	activePopouts.add(popout)
}

export function unregisterActivePopout(popout: GooPopoutRuntime): void {
	activePopouts.delete(popout)
}

/** Shared Goo popout registry controls. */
export const gooPopoutRuntime = {
	closeAll: closeAllPopouts,
	closeOutside: closePopoutsOutside,
	getActive: getActivePopout
}

function closeAllPopouts(): void {
	for (const popout of Array.from(activePopouts)) {
		void popout.close()
	}
}

function closePopoutsOutside(target: HTMLElement): void {
	for (const popout of Array.from(activePopouts)) {
		const element = popout.element
		if (element?.contains(target)) {
			continue
		}

		void popout.close()
	}
}

export function getActivePopout(): GooPopoutRuntime | null {
	const popouts = Array.from(activePopouts)
	return popouts[popouts.length - 1] ?? null
}
