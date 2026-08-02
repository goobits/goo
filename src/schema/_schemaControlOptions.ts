/** Field-root options that must not be repeated inside `controlOptions`. */
const fieldOwnedControlOptionKeys = new Set([
	'ariaLabel',
	'canCross',
	'canPush',
	'className',
	'coverage',
	'dataParam',
	'disabled',
	'displayUnit',
	'dock',
	'dual',
	'format',
	'fullBleed',
	'fullWidth',
	'gradient',
	'id',
	'items',
	'label',
	'layout',
	'marks',
	'max',
	'min',
	'mode',
	'modes',
	'options',
	'path',
	'popoutClass',
	'preset',
	'presetColor',
	'presetHue',
	'scale',
	'shape',
	'showInputs',
	'showLabel',
	'snap',
	'step',
	'selfContained',
	'tabIndex',
	'ticks',
	'type',
	'unit',
	'valueBubble',
	'xy'
])

/** Return the first field-owned option repeated in a component-specific option bag. */
export function findFieldOwnedControlOption(
	controlOptions: Record<string, unknown> | undefined
): string | undefined {
	if (!controlOptions) return undefined
	return Object.keys(controlOptions).find(key => fieldOwnedControlOptionKeys.has(key))
}
