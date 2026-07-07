export const chevronTabDragActivationDistance = 12

export const hasChevronTabDragIntent = (movementX: number, movementY = 0): boolean => {
	const absX = Math.abs(movementX)
	const absY = Math.abs(movementY)
	return absX >= chevronTabDragActivationDistance && absX >= absY * 1.25
}

export const resolveChevronTabKeyboardTargetIndex = (
	currentIndex: number,
	totalTabs: number,
	key: string
): number | null => {
	if (totalTabs <= 0 || currentIndex < 0) return null
	if (key === 'ArrowRight' || key === 'ArrowDown') return (currentIndex + 1) % totalTabs
	if (key === 'ArrowLeft' || key === 'ArrowUp') return (currentIndex - 1 + totalTabs) % totalTabs
	if (key === 'Home') return 0
	if (key === 'End') return totalTabs - 1
	return null
}

export const resolveChevronTabDragInsertion = (
	draggedCenter: number,
	otherCenters: readonly number[]
): number => {
	const firstGreaterCenter = otherCenters.findIndex(center => draggedCenter < center)
	return firstGreaterCenter === -1 ? otherCenters.length : firstGreaterCenter
}
