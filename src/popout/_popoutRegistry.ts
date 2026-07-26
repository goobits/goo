import type { GooPopoutInstance } from './popoutTypes.ts'

export type GooPopoutRuntime = GooPopoutInstance & {
	parent: GooPopoutRuntime | null
	readonly children: Set<GooPopoutRuntime>
}

type ActivePopoutRegistration = {
	escapeToClose: boolean
}

const activePopouts = new Map<GooPopoutRuntime, ActivePopoutRegistration>()

export function registerActivePopout(
	popout: GooPopoutRuntime,
	registration: ActivePopoutRegistration
): void {
	activePopouts.delete(popout)
	activePopouts.set(popout, registration)
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
	for (const popout of Array.from(activePopouts.keys())) {
		void popout.close()
	}
}

function closePopoutsOutside(target: HTMLElement): void {
	for (const popout of Array.from(activePopouts.keys())) {
		const element = popout.element
		if (element?.contains(target)) {
			continue
		}

		void popout.close()
	}
}

export function getActivePopout(): GooPopoutRuntime | null {
	const popouts = Array.from(activePopouts.keys())
	return popouts[popouts.length - 1] ?? null
}

/** Return the topmost popout that opted into Escape dismissal. */
export function getActiveEscapePopout(): GooPopoutRuntime | null {
	const registrations = Array.from(activePopouts.entries())
	for (let index = registrations.length - 1; index >= 0; index -= 1) {
		const [ popout, registration ] = registrations[index]
		if (registration.escapeToClose) return popout
	}
	return null
}
