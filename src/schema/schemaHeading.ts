import { iconRegistry } from '../icon/registry.ts'

export type SchemaHeadingOptions = {
	className?: string

	/** Registered icon name rendered inside the tinted chip. */
	icon?: string
	text: string
}

/**
 * Section heading DOM: tinted icon chip plus label. Used by the schema
 * builder for `heading` nodes and available to imperative controls that
 * render section heads matching the schema's anatomy.
 */
export function createSchemaHeading({ className, icon, text }: SchemaHeadingOptions): HTMLElement {
	const heading = document.createElement('div')
	heading.className = [ 'goo-schema__heading', className ].filter(Boolean).join(' ')
	heading.setAttribute('role', 'heading')
	heading.setAttribute('aria-level', '3')

	const chipSvg = icon ? iconRegistry.get(icon) : null
	if (chipSvg) {
		const chip = document.createElement('span')
		chip.className = 'goo-schema__heading-chip'
		chip.setAttribute('aria-hidden', 'true')
		chip.innerHTML = chipSvg
		heading.append(chip)
	}

	const label = document.createElement('span')
	label.className = 'goo-schema__heading-text'
	label.textContent = text
	heading.append(label)
	return heading
}
