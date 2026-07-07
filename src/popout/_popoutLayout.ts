import type { GooLifecycleBag } from '../support/utils/lifecycleBag.ts'

type PopoutLayoutOptions = {
	element: HTMLElement
	isActive(): boolean
	reposition(): void
}

export async function stabilizeOpeningLayout({
	element,
	isActive,
	reposition
}: PopoutLayoutOptions): Promise<void> {
	element.style.visibility = 'hidden'
	element.style.pointerEvents = 'none'
	element.style.opacity = '0'
	reposition()

	await waitForQuietOpeningLayout({ element, isActive, reposition })
	if (!isActive()) return

	reposition()
	element.style.visibility = ''
	element.style.pointerEvents = ''
}

export function observeOpenLayoutChanges({
	element,
	fullScreen,
	lifecycle,
	reposition,
	targetElement
}: {
	element: HTMLElement
	fullScreen: boolean
	lifecycle: GooLifecycleBag
	reposition(): void
	targetElement: HTMLElement | null
}): void {
	if (fullScreen) return

	if (typeof ResizeObserver === 'function') {
		const resizeObserver = new ResizeObserver(reposition)
		observePopoutLayoutElements(resizeObserver, element, targetElement)
		lifecycle.add(resizeObserver)
	}

	if (typeof MutationObserver === 'function') {
		const mutationObserver = new MutationObserver(reposition)
		mutationObserver.observe(element, {
			childList: true,
			subtree: true
		})
		lifecycle.add(mutationObserver)
	}
}

function waitForQuietOpeningLayout({
	element,
	isActive,
	reposition
}: PopoutLayoutOptions): Promise<void> {
	return new Promise<void>(resolve => {
		let frame = 0
		let finished = false
		let quietFrames = 0
		const observers: Array<{ disconnect(): void }> = []
		const timeout = setTimeout(finish, 240)

		function finish() {
			if (finished) return
			finished = true
			cancelAnimationFrame(frame)
			clearTimeout(timeout)
			observers.forEach(observer => observer.disconnect())
			resolve()
		}

		function schedule() {
			if (finished) return
			if (frame) return
			frame = requestAnimationFrame(() => {
				frame = 0
				if (!isActive()) {
					finish()
					return
				}

				reposition()
				quietFrames += 1
				if (quietFrames >= 2) {
					finish()
					return
				}

				schedule()
			})
		}

		function markDirty() {
			if (finished) return
			quietFrames = 0
			schedule()
		}

		if (typeof ResizeObserver === 'function') {
			const resizeObserver = new ResizeObserver(markDirty)
			observePopoutLayoutElements(resizeObserver, element, null)
			observers.push(resizeObserver)
		}

		if (typeof MutationObserver === 'function') {
			const mutationObserver = new MutationObserver(markDirty)
			mutationObserver.observe(element, {
				childList: true,
				subtree: true
			})
			observers.push(mutationObserver)
		}

		schedule()
	})
}

function observePopoutLayoutElements(
	observer: ResizeObserver,
	element: HTMLElement,
	targetElement: HTMLElement | null
): void {
	observer.observe(element)
	const contentElement = element.querySelector('.goo-popout__content')
	if (contentElement) {
		observer.observe(contentElement)
	}
	if (targetElement) {
		observer.observe(targetElement)
	}
}
