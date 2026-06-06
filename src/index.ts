/// <reference path="./svelte.d.ts" />

/**
 * @goobits/goo
 * Modern UI components with CSS custom properties
 */

// i18n / Locale
export type { LocaleConfig } from './support/i18n/index.ts'
export { getLocale, isRTL, onLocaleChange, setLocale, translate } from './support/i18n/index.ts'

// Utilities
export { clamp, formatNumber, fromPercent, roundNumber, toPercent } from './support/number/index.ts'
export type {
	GooPoint,
	GooPointerDragEvent,
	GooPointerDragHandle,
	GooPointerDragOptions,
	GooPointerTapEvent,
	GooPointerTapOptions,
	GooPointerTargetEvent
} from './support/utils/pointerDrag.ts'
export { createPointerDrag, createPointerTap } from './support/utils/pointerDrag.ts'

// Components
export type { GooAngleInputElement, GooAngleInputEventData, GooAngleInputProps, GooAngleInputUnit } from './angle-input/index.ts'
export { GooAngleInput } from './angle-input/index.ts'
export type { BlendModeFieldOption, BlendModeFieldOptions } from './blend-mode/index.ts'
export { createBlendModeField } from './blend-mode/index.ts'
export type { GooButtonLayout, GooButtonProps, GooButtonType, GooButtonVariant } from './button/index.ts'
export { GooButton } from './button/index.ts'
export type {
	ButtonGroupOption,
	ButtonGroupOptions,
	GooButtonGroupLayout,
	GooButtonGroupProps,
	NormalizedButtonGroupOption
} from './button-group/index.ts'
export { GooButtonGroup } from './button-group/index.ts'
export type { GooCheckboxProps } from './checkbox/index.ts'
export { GooCheckbox } from './checkbox/index.ts'
export type {
	GooContextMenuElement,
	GooContextMenuManager,
	GooContextMenuOpenOptions,
	GooContextMenuOption,
	GooContextMenuOptions,
	ManagedGooContextMenu,
	ManagedGooContextMenuItem,
	ManagedGooContextMenuOptions
} from './context-menu/index.ts'
export { createGooContextMenu, createManagedGooContextMenu, GooContextMenu } from './context-menu/index.ts'
export type {
	GooDataGridCellSlot,
	GooDataGridCellValue,
	GooDataGridColumn,
	GooDataGridColumnAlign,
	GooDataGridDensity,
	GooDataGridHeaderSlot,
	GooDataGridProps,
	GooDataGridRowKey,
	GooDataGridSortDirection,
	GooDataGridSortState,
	GooDataGridSortValue
} from './data-grid/index.ts'
export { GooDataGrid } from './data-grid/index.ts'
export type {
	DialogField,
	DialogLabels,
	DialogResult,
	GooAlertOptions,
	GooConfirmOptions,
	GooDialogInstance,
	GooDialogOptions,
	GooDialogPromise,
	GooNotifyOptions,
	GooOverlayOptions,
	GooPromptOptions
} from './dialog/index.ts'
export {
	createGooDialog,
	createGooDialogTextContent,
	createGooField,
	createGooFields,
	createTrustedGooDialogContent,
	dialogManager,
	GooAlert,
	GooConfirm,
	GooDialog,
	GooDialogController,
	GooDialogManager,
	GooNotify,
	GooOverlay,
	GooPrompt
} from './dialog/index.ts'
export type { DiffOptions, DiffResult } from './diff/index.ts'
export { compare, DiffCanvas, renderBinary, renderGradient } from './diff/index.ts'
export type { GooErrorBoundaryFallback, GooErrorBoundaryProps } from './error-boundary/index.ts'
export { GooErrorBoundary } from './error-boundary/index.ts'
export { GooFocusTrap } from './focus-trap/index.ts'
export type { GooIconProps, GooIconRenderOptions } from './icon/index.ts'
export { GooIcon, iconRegistry, renderIconHtml, renderIconPlaceholderHtml, renderIconPlaceholders } from './icon/index.ts'
export type { GooInputProps, GooInputType, GooNumberProps } from './input/index.ts'
export { GooInput, GooNumber } from './input/index.ts'
export type { GooLabelProps } from './label/index.ts'
export { GooLabel } from './label/index.ts'
export type { GooPopoutAt, GooPopoutInstance, GooPopoutOptions } from './popout/index.ts'
export { closeAllPopouts, closePopoutsOutside, createGooPopout, getActivePopout, GooPopout, HORIZONTAL, VERTICAL } from './popout/index.ts'
export type {
	GooProgressRingHandle,
	GooProgressRingSteps,
	GooProgressRingTimer,
	GooProgressRingTimerOptions,
	GooProgressRingTimerType,
	GooProgressRingVariant
} from './progress-ring/index.ts'
export { createGooProgressRingTimer, GooProgressRing } from './progress-ring/index.ts'
export type { GooRadioGroupLayout, GooRadioGroupProps, GooRadioOption, GooRadioOptions, GooRadioProps } from './radio/index.ts'
export { GooRadio, GooRadioGroup } from './radio/index.ts'
export type {
	GooRangeModuleElement,
	GooRangeModuleEventData,
	GooRangeModuleOptions,
	GooRangeModuleRangeApi,
	GooRangeModuleState,
	GooRangeModuleValue
} from './range-module/index.ts'
export { createGooRangeModule, createRangeModuleField } from './range-module/index.ts'
export type {
	GooSelectElement,
	GooSelectEventData,
	GooSelectMenuOptions,
	GooSelectMenuPlacement,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectProps
} from './select/index.ts'
export { GooSelect } from './select/index.ts'
export type {
	GooSliderDirection,
	GooSliderElement,
	GooSliderEventData,
	GooSliderPreset,
	GooSliderProps,
	GooSliderShape,
	GooSliderThumb,
	GooSliderUnit,
	GooSliderValue
} from './slider/index.ts'
export { GooSlider, sliderPresetConfigs, sliderPresets, sliderShapes } from './slider/index.ts'
export type { GooSpinnerProps, GooSpinnerRenderOptions, GooSpinnerSize, GooSpinnerVariant } from './spinner/index.ts'
export { GooSpinner, renderGooSpinnerHtml } from './spinner/index.ts'
export type {
	GooTableCellSlot,
	GooTableCellValue,
	GooTableColumn,
	GooTableColumnAlign,
	GooTableDensity,
	GooTableHeaderSlot,
	GooTableProps,
	GooTableRowKey,
	GooTableSortDirection,
	GooTableSortState,
	GooTableSortValue
} from './table/index.ts'
export { GooTable } from './table/index.ts'
export type { GooTextareaProps } from './textarea/index.ts'
export { GooTextarea } from './textarea/index.ts'
export type {
	CreateFloatingToolbarViewOptions,
	CreateToolbarToolButtonOptions,
	FloatingToolbarElement,
	FloatingToolbarGroups,
	FloatingToolbarToolConfig,
	ToolbarButtonLayout,
	ToolbarChromeIcon,
	ToolbarConfig,
	ToolbarLayoutMode,
	ToolbarPosition,
	ToolbarToolButtonConfig,
	ToolbarToolButtonElement,
	ToolbarToolEntry
} from './toolbar/index.ts'
export {
	chooseToolbarLayout,
	createFloatingToolbarView,
	createToolbarToolButton,
	FloatingToolbarView,
	getToolbarLayoutSignature,
	isToolbarHorizontalPosition,
	mountFunctionIcon,
	readFloatingToolbarGroups,
	ToolbarToolButton,
	toToolbarButtonLayout
} from './toolbar/index.ts'
export type {
	GooTooltipActionOptions,
	GooTooltipInstance,
	GooTooltipOptions,
	GooTooltipRuntimeOptions,
	GooTooltipRuntimeState
} from './tooltip/index.ts'
export { createGooTooltip, GooTooltip, GooTooltipRuntime, tooltip } from './tooltip/index.ts'
export type { GooTurnstileFieldProps, GooTurnstileSize, GooTurnstileTheme } from './turnstile/index.ts'
export { GooTurnstileField } from './turnstile/index.ts'
export type {
	GridArrowKey,
	GridClickModifiers,
	GridMarqueeMode,
	GridMarqueeOptions,
	GridSelectionState,
	RectXYWH,
	VirtualGridItem,
	VirtualGridItemKey,
	VirtualGridItemRef,
	VirtualGridProps,
	VirtualGridSlot,
	VirtualGridWindow,
	VirtualGridWindowOptions
} from './virtualGrid/index.ts'
export {
	calculateVirtualGridWindow,
	getGridColumns,
	getGridItem,
	getGridItemElement,
	getGridRowHeight,
	getSelectedGridItem,
	getVisibleGridIndexes,
	gridMarquee,
	isGridArrowKey,
	nextGridClickSelection,
	nextGridIndex,
	nextGridMarqueeSelection,
	rectIntersects,
	sameGridSelection,
	scrollToGridItem,
	setGridItemSelected,
	VirtualGrid,
	virtualGridSpacerHeight } from './virtualGrid/index.ts'
export type {
	GooVortexCreateOptions,
	GooVortexHandle,
	GooVortexItem,
	GooVortexOptions,
	GooVortexPoint,
	GooVortexUpdateOptions
} from './vortex/index.ts'
export { createGooVortex, GooVortex } from './vortex/index.ts'

// Composition components
export type { GooColorElement, GooColorEventData, GooColorProps } from './color/index.ts'
export { GooColor } from './color/index.ts'
export type {
	ControllerOption,
	ControllerOptionValue,
	ControlTypeConfig,
	ControlTypeEntry,
	ControlTypeRegistry,
	GooControllerOptions,
	SvelteControlSchema
} from './controller/index.ts'
export { addColor, createGooController, defaultControlRegistry, GooController, resolveControlTypeConfig } from './controller/index.ts'
export type {
	GooFloatingWindow,
	GooFloatingWindowHorizontalAlign,
	GooFloatingWindowOptions,
	GooFloatingWindowPosition,
	GooFloatingWindowSettings,
	GooFloatingWindowStorage,
	GooFloatingWindowVerticalAlign
} from './floating-window/index.ts'
export { createGooFloatingWindow, hideFocusedGooFloatingWindow, normalizeFloatingWindowSettings } from './floating-window/index.ts'
export type { GooFolderElement, GooFolderOptions } from './folder/index.ts'
export { GooFolder } from './folder/index.ts'
export type { GridPopoutItem, GridPopoutSvgElement, GridPopoutSvgIcon, GridPopoutTriggerElement, GridPopoutTriggerOptions } from './grid-popout/index.ts'
export { createGridPopoutTrigger, GridPickerSelectedMark, GridPopoutPicker, GridPopoutTrigger } from './grid-popout/index.ts'
export type { GooPanelElement, GooPanelOptions } from './panel/index.ts'
export { GooPanel } from './panel/index.ts'

// Schema-driven UI
export type {
	ControllerFieldLayout,
	ControllerOptions,
	GooSchemaControlType,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaType,
	NormalizedSelectOption
} from './schema/index.ts'
export {
	applyFieldValueFormatOptions,
	buildControllerOptions,
	createGooSchema,
	detectFieldType,
	getByPath,
	getControllerFieldLayout,
	GooSchema,
	GooSchemaComponent,
	isSelfContainedField,
	normalizeFieldLayout,
	normalizeSelectOptions,
	pathToLabel,
	resolvePath,
	setByPath,
	shouldRenderSchemaNode
} from './schema/index.ts'
