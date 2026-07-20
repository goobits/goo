import { translate } from '../support/i18n/index.ts'

/** Translate compact schema keys while leaving authored phrases untouched. */
export function localizeSchemaText(value: string | undefined): string | undefined {
	if (!value || /\s/.test(value)) return value
	return translate(value)
}
