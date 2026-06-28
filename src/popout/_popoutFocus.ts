type EscapeLifecycle = {
	listen(
		target: Document,
		type: 'keydown',
		handler: (event: KeyboardEvent) => void,
		options: { capture: boolean }
	): void
}

export function capturePopoutFocusTarget(initialFocus: 'content' | 'popout' | 'none'): HTMLElement | null {
	if (initialFocus === 'none') {
		return null
	}

	return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

export function restorePopoutFocus(
	removedElement: HTMLElement,
	previousActiveElement: HTMLElement | null
): HTMLElement | null {
	if (!previousActiveElement) return null
	const activeElement = document.activeElement
	if (
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement &&
		activeElement.isConnected &&
		!removedElement.contains(activeElement)
	) {
		return null
	}

	if (previousActiveElement.isConnected) {
		previousActiveElement.focus({ preventScroll: true })
	}
	return null
}

export function bindImmediateEscapeToClose({
	close,
	escapeToClose,
	isActive,
	isOpen,
	lifecycle
}: {
	close(): Promise<void>
	escapeToClose: boolean
	isActive(): boolean
	isOpen(): boolean
	lifecycle: EscapeLifecycle
}): void {
	if (!escapeToClose) return

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || !isOpen() || !isActive()) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		void close()
	}
	lifecycle.listen(document, 'keydown', handleKeydown, { capture: true })
}
