type EscapeLifecycle = {
	listen(
		target: Document,
		type: 'keydown',
		handler: (event: KeyboardEvent) => void,
		options: { capture: boolean }
	): void
}

export function bindImmediatePopoutEscapeToClose({
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
		event.stopImmediatePropagation()
		void close()
	}
	lifecycle.listen(document, 'keydown', handleKeydown, { capture: true })
}
