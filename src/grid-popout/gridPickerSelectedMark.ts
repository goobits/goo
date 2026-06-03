export const GRID_PICKER_SELECTED_MARK_CLASS = 'goo-grid-picker-selected-mark'
export const GRID_PICKER_SELECTED_MARK_ICON_CLASS = 'goo-grid-picker-selected-mark__icon'

const LUCIDE_CHECK_PATH = 'M20 6 9 17l-5-5'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

export function createGridPickerSelectedMark(): HTMLSpanElement {
	const mark = document.createElement('span')
	mark.className = GRID_PICKER_SELECTED_MARK_CLASS
	mark.setAttribute('aria-hidden', 'true')

	const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
	svg.setAttribute('class', GRID_PICKER_SELECTED_MARK_ICON_CLASS)
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke', 'currentColor')
	svg.setAttribute('stroke-linecap', 'round')
	svg.setAttribute('stroke-linejoin', 'round')

	const path = document.createElementNS(SVG_NAMESPACE, 'path')
	path.setAttribute('d', LUCIDE_CHECK_PATH)
	svg.appendChild(path)
	mark.appendChild(svg)

	return mark
}
