/**
 * @fileoverview Schema type definitions for GooSchema.
 * @module goobits/schema/types
 */

import type { GooControlType, GooControlTypeRegistry } from '../controller/controlTypes.ts'
import type {
	GooSliderMark,
	GooSliderMode,
	GooSliderPreset,
	GooSliderScale,
	GooSliderShape,
	GooSliderSnap,
	GooSliderValueBubble
} from '../slider/types.ts'

/**
 * Control field definition type identifiers.
 */
export type GooSchemaControlType = GooControlType

export type GooSchemaData = Record<string, unknown>

/** Primitive value allowed inside a portable GooSchema description. */
export type GooSchemaDescriptorPrimitive = string | number | boolean | null

/**
 * Recursively portable value allowed inside a GooSchema description.
 * Runtime callbacks and constructed objects belong in a control registry.
 */
export type GooSchemaDescriptorValue =
	| GooSchemaDescriptorPrimitive
	| GooSchemaDescriptorValue[]
	| { [key: string]: GooSchemaDescriptorValue | undefined }

/** Pure-data options passed from a schema node to a named control. */
export type GooSchemaControlOptions = Record<string, GooSchemaDescriptorValue | undefined>

/** Pure-data option accepted by select and button-group schema fields. */
export interface GooSchemaChoiceOption {
	id?: string | number
	key?: string | number
	value?: string | number
	label?: string | number
	icon?: string
	tooltip?: string
	ariaLabel?: string
	hideLabel?: boolean
	className?: string
	disabled?: boolean
	/** Show this choice when the condition matches the schema data. */
	if?: GooSchemaCondition
	/** Hide this choice when the condition matches the schema data. */
	unless?: GooSchemaCondition
}

export type GooSchemaChangeHandler = (path: string, value: unknown) => void

/** Built-in actions a schema or folder may expose. */
export interface GooSchemaActionOptions {
	/** Track committed values and expose Undo, with Redo while Alt is held. */
	history?: boolean

	/** Reset values from the schema's existing defaults object. */
	reset?: boolean
}

/** Source of a final schema data transaction. */
export type GooSchemaCommitReason = 'change' | 'preset' | 'redo' | 'reset' | 'undo'

/** One atomic schema mutation emitted to a host. */
export interface GooSchemaCommitDetail {
	data: GooSchemaData
	paths: string[]
	reason: GooSchemaCommitReason
	scope: string
}

/** Programmatic final-transaction handler. */
export type GooSchemaCommitHandler = (detail: GooSchemaCommitDetail) => void

/** Normalize a field-driven transaction before GooSchema records it. */
export type GooSchemaCommitNormalizer = (
	data: GooSchemaData,
	paths: readonly string[]
) => GooSchemaData | void

/** Programmatic data update source for schema refresh behavior. */
export type GooSchemaDataUpdateReason = GooSchemaCommitReason | 'sync'

/** Options for applying schema data without rebuilding the schema. */
export interface GooSchemaDataUpdateOptions {
	/** Briefly mark controls whose displayed values changed. */
	animate?: boolean

	/** Semantic source of the data update. */
	reason?: GooSchemaDataUpdateReason
}

/** Options for committing externally controlled schema data into history. */
export interface GooSchemaCommitOptions {
	/** Briefly mark controls whose displayed values changed. */
	animate?: boolean

	/** Semantic source of the transaction. */
	reason?: GooSchemaCommitReason

	/** Optional action scope; defaults to the whole schema. */
	scope?: string
}

export type GooSchemaCondition = string | {
	path: string
	equals?: GooSchemaDescriptorValue
	notEquals?: GooSchemaDescriptorValue
}

export type GooSchemaFieldLayout = 'inline' | 'stacked' | 'self-contained' | 'full-bleed'

/** Host shell zone a self-contained control docks into (pinned above the
    scroll area, or a footer below it). Stamped as `data-goo-dock` on the
    rendered control so shells can relocate it without knowing its type. */
export type GooSchemaDockZone = 'pinned' | 'footer'

export type GooSchemaValueFormat = 'percent' | 'number' | 'integer' | 'float' | string

/**
 * Named data snapshot that can be applied to a schema as a preset.
 */
export interface GooSchemaPreset {
	/** Stable preset identifier. */
	id: string

	/** User-facing preset label. */
	label: string

	/** Data applied when this preset is selected. */
	data: GooSchemaData
}

/**
 * Control field definition - binds to a data property.
 */
export interface GooSchemaField {
	/** Dot-notation path to bind: "tip.bristles.count" or "layers.0.enabled" */
	path: string

	/**
	 * Control type (auto-detected from value if omitted):
	 * - boolean -> 'checkbox'
	 * - number + min/max -> 'range' (or 'slider')
	 * - number without bounds -> 'number'
	 * - string -> 'text'
	 * - array of options -> 'select'
	 */
	type?: GooSchemaControlType

	/** Display label (auto-generated from path if omitted) */
	label?: string

	/** Minimum value. */
	min?: number

	/** Maximum value. */
	max?: number

	/** Step increment. */
	step?: number

	/** Render a slider with adjacent numeric input(s). */
	input?: boolean

	/** Allow range thumbs to cross. */
	canCross?: boolean

	/** Push neighboring thumbs when crossing is disabled. */
	canPush?: boolean

	/** Dual-thumb slider for [min, max] pairs. Data must be [min, max] array or {min,max} object. */
	dual?: boolean

	/** 2D point controls bind to `{x,y}` values and use this label for the pad and number fields. */
	xy?: boolean

	/** Show coverage bar. */
	coverage?: boolean

	/** Range preset styling. */
	preset?: GooSliderPreset

	/** Color for opacity preset. */
	presetColor?: string

	/** Hue for saturation preset. */
	presetHue?: number

	/** Track shape (for sliders). */
	shape?: GooSliderShape

	/** Slider value-to-track mapping. */
	scale?: GooSliderScale

	/** Explicit slider interaction mode. */
	mode?: GooSliderMode

	/** Slider track colors. */
	gradient?: string[]

	/** Explicit slider track marks. */
	marks?: GooSliderMark[]

	/** Snap to marks/ticks or explicit values. */
	snap?: GooSliderSnap

	/** Slider value bubble visibility. */
	valueBubble?: GooSliderValueBubble

	/** Unit of measurement. */
	unit?: 'degree' | 'radian' | '%' | 'px' | 'x' | string

	/** Unit used for display when it differs from the raw semantic unit. */
	displayUnit?: 'degree' | 'radian' | '%' | 'px' | 'x' | string

	/** Display/parse format hint for controls that support specialized formatting. */
	format?: GooSchemaValueFormat

	/** Alias for `format` when schema authors want an explicit value-display term. */
	valueFormat?: GooSchemaValueFormat

	/** Hide the generated controller label while preserving the bound path. */
	showLabel?: boolean

	/** Let controls that support full-width rendering consume the schema hint. */
	fullWidth?: boolean

	/** Render the GooController row edge-to-edge without controller padding or dividers. */
	fullBleed?: boolean

	/** Show range tick marks when the control supports ticks. */
	ticks?: boolean

	/** Options for select/button-group controls. */
	options?: Array<string | number | GooSchemaChoiceOption>

	/** Mode ids for blend-mode controls. */
	modes?: readonly string[]

	/** Accessible label forwarded to controls that render their own shell. */
	ariaLabel?: string

	/** Control host class forwarded to self-contained controls. */
	class?: string

	/** Data parameter forwarded to self-contained controls. */
	dataParam?: string

	/** DOM id forwarded to self-contained controls. */
	id?: string

	/** Portable item metadata for grid-style choice controls. */
	items?: readonly GooSchemaDescriptorValue[]

	/** Popout class forwarded to popout-backed controls. */
	popoutClass?: string

	/** Tab index forwarded to self-contained controls. */
	tabIndex?: number

	/** Component-specific options forwarded to the selected control. */
	controlOptions?: GooSchemaControlOptions

	/** Show field when condition matches. */
	if?: GooSchemaCondition

	/** Hide field when condition matches. */
	unless?: GooSchemaCondition

	/** Layout mode for goo-controller. */
	layout?: GooSchemaFieldLayout

	/** Shell zone this control docks into. */
	dock?: GooSchemaDockZone

	/** Disable the generated field/control. */
	disabled?: boolean

	/** Render directly without a GooController row wrapper. */
	selfContained?: boolean
}

/** Folder container that groups related fields. */
export interface GooSchemaFolder {
	type: 'folder'

	/** Optional stable identifier for scoped actions and automation. */
	id?: string

	/** Folder title. */
	title: string

	/** Override the host's default folder actions, or disable them. */
	actions?: false | GooSchemaActionOptions

	/** Additional classes for the folder element. */
	className?: string

	/** Initially expanded. */
	open?: boolean

	/** Child nodes. */
	children: GooSchemaNode[]

	/** Conditional visibility. */
	if?: GooSchemaCondition
	unless?: GooSchemaCondition
}

/** Static explanatory text rendered between schema controls. */
export interface GooSchemaNote {
	type: 'note'
	text: string
	className?: string
	if?: GooSchemaCondition
	unless?: GooSchemaCondition
}

/** Section heading with an optional tinted icon chip. */
export interface GooSchemaHeading {
	type: 'heading'
	text: string
	/** Registered icon name rendered inside the heading chip. */
	icon?: string
	className?: string
	if?: GooSchemaCondition
	unless?: GooSchemaCondition
}

/** Registered control that is not bound to schema data. */
export interface GooSchemaWidget {
	type: 'widget'
	widget: GooSchemaControlType
	id?: string
	label?: string
	showLabel?: boolean
	layout?: GooSchemaFieldLayout

	/** Shell zone this control docks into. */
	dock?: GooSchemaDockZone
	className?: string
	options?: GooSchemaControlOptions
	if?: GooSchemaCondition
	unless?: GooSchemaCondition
}

/** Panel root container. */
export interface GooSchemaPanel {
	type: 'panel'

	/** Panel title. */
	title?: string

	/** Docked layout space vs floating. */
	docked?: boolean

	/** Panel width in pixels. */
	width?: number

	/** Render the GooPanel header for this panel. */
	showHeader?: boolean

	/** Child nodes. */
	children: GooSchemaNode[]
}

/**
	 * Any schema node.
	 */
export type GooSchemaNode =
	| GooSchemaField
	| GooSchemaFolder
	| GooSchemaHeading
	| GooSchemaNote
	| GooSchemaWidget

/**
 * Root schema definition.
 */
export type GooSchemaType = GooSchemaPanel | GooSchemaNode[]

/**
 * Options for creating a GooSchema instance.
 */
export interface GooSchemaOptions {
	/** Root schema definition. */
	schema?: GooSchemaType

	/** Data object bound to schema fields. */
	data?: GooSchemaData

	/** Default data used by the reset action. */
	defaults?: GooSchemaData

	/** Actions exposed for the whole schema. */
	actions?: GooSchemaActionOptions

	/** Default actions inherited by schema folders. */
	folderActions?: GooSchemaActionOptions

	/** Named data presets the schema can apply. */
	presets?: GooSchemaPreset[]

	/** Currently selected preset id, if known by the caller. */
	activePresetId?: string | null

	/** Render a reset button when defaults are available. */
	showReset?: boolean

	/** Programmatic change handler. */
	onchange?: GooSchemaChangeHandler

	/** Programmatic final-transaction handler. */
	oncommit?: GooSchemaCommitHandler

	/** Normalize field-driven data before it enters history. */
	normalizeCommit?: GooSchemaCommitNormalizer

	/** Programmatic reset handler. */
	onreset?: (data: GooSchemaData) => void

	/** Programmatic preset handler. */
	onpreset?: (preset: GooSchemaPreset) => void

	/** Render controls directly without panel wrapper. */
	bare?: boolean

	/** Render the generated GooPanel header when not in bare mode. */
	showPanelHeader?: boolean

	/** Additional classes applied to every generated folder. */
	folderClassName?: string

	/** Optional control type registry override. */
	controlTypes?: GooControlTypeRegistry
}

/**
 * Runtime state for a GooSchema instance.
 */
export interface GooSchemaState {
	disabled?: boolean
	schema: GooSchemaType

	/** Default data used by the reset action. */
	defaults?: GooSchemaData

	/** Actions exposed for the whole schema. */
	actions?: GooSchemaActionOptions

	/** Default actions inherited by schema folders. */
	folderActions?: GooSchemaActionOptions

	/** Named data presets the schema can apply. */
	presets?: GooSchemaPreset[]

	/** Currently selected preset id, if known by the caller. */
	activePresetId?: string | null

	/** Render a reset button when defaults are available. */
	showReset?: boolean

	/** Render controls directly without panel wrapper. */
	bare?: boolean

	/** Render the generated GooPanel header when not in bare mode. */
	showPanelHeader?: boolean

	/** Additional classes applied to every generated folder. */
	folderClassName?: string

	/** Optional control type registry override. */
	controlTypes?: GooControlTypeRegistry
}
