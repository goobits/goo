export type PopoutAnimationState = {
	cleanup: (() => void) | null
}

export function cancelPopoutAnimation(state: PopoutAnimationState): void {
	state.cleanup?.()
	state.cleanup = null
}

export function animatePopoutIn({
	element,
	isActive,
	state
}: {
	element: HTMLElement
	isActive(): boolean
	state: PopoutAnimationState
}): Promise<void> {
	cancelPopoutAnimation(state)
	return new Promise(resolve => {
		let frame = 0
		let timer: ReturnType<typeof setTimeout> | null = null
		let finished = false
		const finish = () => {
			if (finished) return
			finished = true
			if (frame) cancelAnimationFrame(frame)
			if (timer) clearTimeout(timer)
			frame = 0
			timer = null
			if (state.cleanup === finish) state.cleanup = null
			resolve()
		}
		state.cleanup = finish

		element.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out'
		element.style.transform = 'translateY(-4px)'
		element.style.opacity = '0'

		frame = requestAnimationFrame(() => {
			frame = 0
			if (!isActive()) {
				finish()
				return
			}
			element.style.transform = 'translateY(0)'
			element.style.opacity = '1'

			timer = setTimeout(finish, 150)
		})
	})
}

export function animatePopoutOut(
	element: HTMLElement | null,
	state: PopoutAnimationState
): Promise<void> {
	cancelPopoutAnimation(state)
	return new Promise<void>(resolve => {
		if (!element) {
			resolve()
			return
		}
		let timer: ReturnType<typeof setTimeout> | null = null
		let finished = false
		const finish = () => {
			if (finished) return
			finished = true
			if (timer) clearTimeout(timer)
			timer = null
			if (state.cleanup === finish) state.cleanup = null
			resolve()
		}
		state.cleanup = finish

		element.style.transition = 'opacity 150ms ease-out'
		element.style.opacity = '0'

		timer = setTimeout(finish, 150)
	})
}
