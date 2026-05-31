/**
 * @fileoverview Schema type definitions for GooSchema.
 * @module goobits/schema/types
 */

import type { ControlTypeRegistry } from '../controller/controlRegistry.js'

/**
 * Control field definition type identifiers.
 */
export type GooSchemaControlType =
  | 'range'
  | 'range-dual'
  | 'checkbox'
  | 'select'
  | 'color'
  | 'text'
  | 'number'
  | 'button'
  | 'button-group'
  | 'angle'
  | 'textarea'
  | 'radio'
  | 'slider'
  | (string & {})

/**
 * Control field definition - binds to a data property.
 */
export interface GooSchemaField {

	/** Component-specific options forwarded to the selected control. */
	[controlOption: string]: unknown

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

	/** Dual-thumb slider for [min, max] pairs. Data must be [min, max] array or {min, max} object. */
	dual?: boolean

	/** Show coverage bar. */
	coverage?: boolean

	/** Range preset styling. */
	preset?: 'hue' | 'opacity' | 'saturation' | 'brightness' | 'bipolar' | 'size'

	/** Color for opacity preset. */
	presetColor?: string

	/** Hue for saturation preset. */
	presetHue?: number

	/** Track shape (for sliders). */
	shape?: 'default' | 'wedge' | 'wedge-left' | string

	/** Unit of measurement. */
	unit?: 'degree' | 'radian' | '%' | 'px' | 'x'

	/** Options for select/button-group controls. */
	options?: Array<string | { label: string; id?: string; icon?: string }>

	/** Show field when path is truthy. */
	if?: string

	/** Show field when path is falsy. */
	unless?: string

	/** Layout mode for goo-controller. */
	layout?: 'inline' | 'stacked'
}

/**
 * Folder container - groups related fields.
 */
export interface GooSchemaFolder {
	type: 'folder'

	/** Folder title. */
	title: string

	/** Initially expanded. */
	open?: boolean

	/** Child nodes. */
	children: GooSchemaNode[]

	/** Conditional visibility. */
	if?: string
	unless?: string
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
 * Runtime state for a GooSchema instance.
 */
export interface GooSchemaState {
	disabled?: boolean
	schema: GooSchemaType

	/** Render controls directly without panel wrapper. */
	bare?: boolean

	/** Render the generated GooPanel header when not in bare mode. */
	showPanelHeader?: boolean

	/** Optional control type registry override. */
	controlTypes?: ControlTypeRegistry
}
