/**
 * @fileoverview Schema type definitions for GooSchema.
 * @module goobits/schema/types
 */

import type { GooControlOptionBag, GooControlType, GooControlTypeRegistry } from '../controller/controlRegistry.ts'
import type { GooSliderPreset, GooSliderShape } from '../slider/types.ts'

/**
 * Control field definition type identifiers.
 */
export type GooSchemaControlType = GooControlType

export type GooSchemaData = Record<string, unknown>

export type GooSchemaChangeHandler = (path: string, value: unknown) => void

export type GooSchemaCondition = string | {
	path: string
	equals?: unknown
	notEquals?: unknown
}

export type GooSchemaFieldLayout = 'inline' | 'stacked' | 'self-contained' | 'full-bleed'

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

	/** Dual-thumb slider for [min, max] pairs. Data must be [min, max] array or {min, max} object. */
	dual?: boolean

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
		options?: Array<string | { label?: string; id?: string; key?: string; value?: string; icon?: string }>

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

	/** Rich item metadata for grid-style choice controls. */
	items?: unknown[]

	/** Popout class forwarded to popout-backed controls. */
	popoutClass?: string

	/** Tab index forwarded to self-contained controls. */
	tabIndex?: number

	/** Component-specific options forwarded to the selected control. */
	controlOptions?: GooControlOptionBag

	/** Show field when condition matches. */
	if?: GooSchemaCondition

	/** Hide field when condition matches. */
	unless?: GooSchemaCondition

	/** Layout mode for goo-controller. */
	layout?: GooSchemaFieldLayout

	/** Disable the generated field/control. */
	disabled?: boolean

	/** Render directly without a GooController row wrapper. */
	selfContained?: boolean
}

/**
	 * Folder container - groups related fields.
	 */
export interface GooSchemaFolder {
	type: 'folder'

	/** Folder title. */
	title: string

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

/**
	 * Panel root container.
	 */
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
export type GooSchemaNode = GooSchemaField | GooSchemaFolder

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

	/** Named data presets the schema can apply. */
	presets?: GooSchemaPreset[]

	/** Currently selected preset id, if known by the caller. */
	activePresetId?: string | null

	/** Render a reset button when defaults are available. */
	showReset?: boolean

	/** Programmatic change handler. */
	onchange?: GooSchemaChangeHandler

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
