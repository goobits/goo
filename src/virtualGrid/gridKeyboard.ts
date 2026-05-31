export type GridArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

export function isGridArrowKey(key: string): key is GridArrowKey {
	return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight'
}

export function nextGridIndex(
	current: number,
	key: GridArrowKey,
	columns: number,
	total: number
): number {
	if (total <= 0 || current < 0 || current >= total) return current
	const stride = Math.max(1, columns)
	switch (key) {
		case 'ArrowLeft':  return Math.max(0, current - 1)
		case 'ArrowRight': return Math.min(total - 1, current + 1)
		case 'ArrowUp':    return Math.max(0, current - stride)
		case 'ArrowDown':  return Math.min(total - 1, current + stride)
	}
}
