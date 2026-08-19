import { createGooField } from './createGooField.ts'
import type { DialogField } from './dialogBuilder.ts'

/** Build the optional prompt fields without loading Goo's control registry for other dialogs. */
export function buildDialogFields(
	fieldsContainer: HTMLElement,
	fields: DialogField[]
): Map<string, HTMLElement> {
	const fieldElements = new Map<string, HTMLElement>()

	for (const fieldConfig of fields) {
		const field = document.createElement('div')
		field.className = 'goo-dialog__field'
		const element = createGooField(fieldConfig)
		if (!element) continue

		if (fieldConfig.label && !element.querySelector?.('label')) {
			const label = document.createElement('label')
			label.className = 'goo-dialog__field-label'
			label.textContent = fieldConfig.label
			field.appendChild(label)
		}

		field.appendChild(element)
		fieldsContainer.appendChild(field)
		if (fieldConfig.name) fieldElements.set(fieldConfig.name, element)
	}

	return fieldElements
}
