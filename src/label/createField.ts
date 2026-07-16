/** Options shared by Goo's imperative field compositions. */
export type GooFieldOptions = {
	className?: string
	id?: string
}

/** Options for a row that pairs a label with a control. */
export type GooLabeledFieldOptions = GooFieldOptions & {
	control?: HTMLElement
	label?: string
	type?: string
}

/** Generic group for related Goo fields. */
export type GooFieldGroupElement = HTMLDivElement & {
	destroy(): void
}

/** Generic row that pairs a label with a Goo control. */
export type GooLabeledFieldElement = HTMLDivElement & {
	control: HTMLElement | null
	destroy(): void
}

/** Create a container for related Goo fields. */
export function createFieldGroup(options: GooFieldOptions = {}): GooFieldGroupElement {
	const group = document.createElement('div') as GooFieldGroupElement
	group.className = joinClassNames('goo-field-group', options.className)
	if (options.id) group.id = options.id
	group.destroy = () => {
		for (const child of Array.from(group.children)) {
			const field = child as HTMLElement & { destroy?: () => void }
			field.destroy?.()
		}
		group.remove()
	}
	return group
}

/** Create a readable label-and-control row without framework-specific markup. */
export function createLabeledField(options: GooLabeledFieldOptions = {}): GooLabeledFieldElement {
	const field = document.createElement('div') as GooLabeledFieldElement
	field.className = joinClassNames('goo-field', options.className)
	if (options.id) field.id = options.id
	if (options.type) field.dataset.gooFieldType = options.type

	const label = document.createElement('span')
	label.className = 'goo-field__label goo-label'
	label.textContent = options.label ?? ''
	label.hidden = !options.label
	field.appendChild(label)
	if (options.control) field.appendChild(options.control)

	Object.defineProperty(field, 'control', {
		configurable: true,
		get: () => options.control ?? null
	})
	field.destroy = () => {
		const control = options.control as (HTMLElement & { destroy?: () => void }) | undefined
		control?.destroy?.()
		field.remove()
	}
	return field
}

function joinClassNames(...values: Array<string | undefined>): string {
	return values.filter(Boolean).join(' ')
}
