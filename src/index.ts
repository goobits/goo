/// <reference path="./svelte.d.ts" />

/**
 * @goobits/goo root aggregate.
 *
 * Prefer package subpaths in application code. The root export delegates to
 * documented subpath owners so public shapes are not duplicated here.
 */

export type { GooAngleInputElement, GooAngleInputEventData, GooAngleInputProps, GooAngleInputUnit } from './angle-input/index.ts'
export { GooAngleInput } from './angle-input/index.ts'
export type { GooButtonLayout, GooButtonProps, GooButtonTarget, GooButtonType, GooButtonVariant } from './button/index.ts'
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
export type { GooColorElement, GooColorEventData, GooColorProps } from './color/index.ts'
export { GooColor } from './color/index.ts'
export type {
	GooContextMenuElement,
	GooContextMenuManager,
	GooContextMenuOpenOptions,
	GooContextMenuOption,
	GooContextMenuOptions,
	ManagedGooContextMenu,
	ManagedGooContextMenuEventHandler,
	ManagedGooContextMenuEventName,
	ManagedGooContextMenuItem,
	ManagedGooContextMenuItemAction,
	ManagedGooContextMenuItemPredicate,
	ManagedGooContextMenuItems,
	ManagedGooContextMenuObjectItem,
	ManagedGooContextMenuOpenAt,
	ManagedGooContextMenuOpenOptions,
	ManagedGooContextMenuOptions
} from './context-menu/index.ts'
export { createGooContextMenu, GooContextMenu } from './context-menu/index.ts'
export type {
	ControllerOption,
	ControllerOptionValue,
	GooBuiltInControlType,
	GooControlFactory,
	GooController,
	GooControllerBinding,
	GooControllerChangeDetail,
	GooControllerControlType,
	GooControllerEventDetail,
	GooControllerEventName,
	GooControllerInputDetail,
	GooControllerOptions,
	GooControlOptionBag,
	GooControlOptions,
	GooControlOptionValue,
	GooControlType,
	GooControlTypeConfig,
	GooControlTypeRegistry,
	GooFactoryControlTypeConfig,
	GooSvelteControlModule,
	GooSvelteControlTypeConfig,
	SvelteControlSchema
} from './controller/index.ts'
export { createGooController, defineFactoryControlType, defineSvelteControlType } from './controller/index.ts'
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
	DialogFieldElements,
	DialogLabels,
	DialogResult,
	DialogValues,
	DialogVerifyHandler,
	GooAlertOptions,
	GooConfirmOptions,
	GooDialogDefaultFocus,
	GooDialogInstance,
	GooDialogOptions,
	GooDialogTask,
	GooDialogType,
	GooNotifyOptions,
	GooOverlayOptions,
	GooPromptOptions
} from './dialog/index.ts'
export {
	createGooDialog,
	createGooDialogTextContent,
	createTrustedGooDialogContent,
	dialogManager,
	GooAlert,
	GooConfirm,
	GooDialog,
	GooDialogManager,
	GooNotify,
	GooOverlay,
	GooPrompt
} from './dialog/index.ts'
export type { GooErrorBoundaryFallback, GooErrorBoundaryProps } from './error-boundary/index.ts'
export { GooErrorBoundary } from './error-boundary/index.ts'
export type {
	GooFloatingWindow,
	GooFloatingWindowHorizontalAlign,
	GooFloatingWindowOptions,
	GooFloatingWindowPosition,
	GooFloatingWindowRuntime,
	GooFloatingWindowSettings,
	GooFloatingWindowStorage,
	GooFloatingWindowVerticalAlign
} from './floating-window/index.ts'
export { createGooFloatingWindow, gooFloatingWindowRuntime } from './floating-window/index.ts'
export { GooFocusTrap } from './focus-trap/index.ts'
export type { GooFolderElement, GooFolderOptions } from './folder/index.ts'
export { GooFolder } from './folder/index.ts'
export type { GooIconProps, GooIconRenderOptions } from './icon/index.ts'
export { GooIcon, renderIconHtml, renderIconPlaceholderHtml, renderIconPlaceholders } from './icon/index.ts'
export type { GooInputProps, GooInputType, GooNumberProps } from './input/index.ts'
export { GooInput, GooNumber } from './input/index.ts'
export type { GooLabelProps } from './label/index.ts'
export { GooLabel } from './label/index.ts'
export type { GooPanelElement, GooPanelOptions } from './panel/index.ts'
export { GooPanel } from './panel/index.ts'
export type { GooPopoutAt, GooPopoutInstance, GooPopoutManager, GooPopoutOptions } from './popout/index.ts'
export { createGooPopout, GooPopout, gooPopoutRuntime } from './popout/index.ts'
export type { GooPreviewBackground, GooPreviewFit, GooPreviewProps, GooPreviewSize } from './preview/index.ts'
export { GooPreview } from './preview/index.ts'
export type {
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
	GooSchemaChangeHandler,
	GooSchemaControlType,
	GooSchemaData,
	GooSchemaElement,
	GooSchemaEvent,
	GooSchemaEventDetail,
	GooSchemaEventName,
	GooSchemaField,
	GooSchemaFolder,
	GooSchemaNode,
	GooSchemaOptions,
	GooSchemaPreset,
	GooSchemaPresetEvent,
	GooSchemaPresetEventDetail,
	GooSchemaResetEvent,
	GooSchemaResetEventDetail,
	GooSchemaType,
	GooSchemaUpdateOptions
} from './schema/index.ts'
export { createGooSchema, GooSchema } from './schema/index.ts'
export type {
	GooSelectActionContext,
	GooSelectChangeHandler,
	GooSelectCloseHandler,
	GooSelectElement,
	GooSelectEventData,
	GooSelectEventName,
	GooSelectMenuOptions,
	GooSelectMenuPlacement,
	GooSelectOpenHandler,
	GooSelectOpenOptions,
	GooSelectOption,
	GooSelectOptionInput,
	GooSelectOptionMap,
	GooSelectOptionMapValue,
	GooSelectOptionsInput,
	GooSelectProps,
	GooSelectRenderable,
	GooSelectShortcut
} from './select/index.ts'
export { GooSelect } from './select/index.ts'
export type {
	GooSliderDirection,
	GooSliderElement,
	GooSliderEventData,
	GooSliderMark,
	GooSliderMode,
	GooSliderPreset,
	GooSliderProps,
	GooSliderScale,
	GooSliderShape,
	GooSliderSnap,
	GooSliderThumb,
	GooSliderTickConfig,
	GooSliderUnit,
	GooSliderValue,
	GooSliderValueBubble
} from './slider/index.ts'
export { GooSlider, sliderPresetConfigs, sliderPresets, sliderShapes } from './slider/index.ts'
export type {
	GooSliderFieldElement,
	GooSliderFieldEventData,
	GooSliderFieldOptions,
	GooSliderFieldSliderApi,
	GooSliderFieldState,
	GooSliderFieldValue
} from './slider-field/index.ts'
export { createSliderField } from './slider-field/index.ts'
export type { GooSpinnerProps, GooSpinnerRenderOptions, GooSpinnerSize, GooSpinnerVariant } from './spinner/index.ts'
export { GooSpinner, renderGooSpinnerHtml } from './spinner/index.ts'
export type { LocaleConfig } from './support/i18n/index.ts'
export { getLocale, isRTL, onLocaleChange, setLocale, translate } from './support/i18n/index.ts'
export { clamp, formatNumber, fromPercent, roundNumber, toPercent } from './support/number/index.ts'
export type {
	AlignmentConfig,
	PositionElementAtOptions,
	PositionOptions,
	PositionResult
} from './support/positioning/index.ts'
export {
	applyArrowPosition,
	applyPosition,
	calculatePosition,
	getOppositeEdge,
	HORIZONTAL,
	parseAlignment,
	positionElementAt,
	VERTICAL
} from './support/positioning/index.ts'
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
export type { GooTextareaProps } from './textarea/index.ts'
export { GooTextarea } from './textarea/index.ts'
export type {
	GooProgressToastHandle,
	GooProgressToastOptions,
	GooToasterProps,
	GooToastHandle,
	GooToastProps,
	Toast,
	ToastAction,
	ToastOptions,
	ToastPosition,
	ToastService,
	ToastVariant
} from './toast/index.ts'
export {
	createGooProgressToast,
	destroyGooToaster,
	ensureGooToaster,
	GooToast,
	GooToaster,
	showGooToast,
	showGooToastError,
	showGooToastSuccess,
	showGooToastWarning,
	toast
} from './toast/index.ts'
export type {
	GooTooltipActionOptions,
	GooTooltipInstance,
	GooTooltipOptions,
	GooTooltipRuntimeApi,
	GooTooltipRuntimeHandle,
	GooTooltipRuntimeOptions
} from './tooltip/index.ts'
export { createGooTooltip, GooTooltip, gooTooltipRuntime, tooltip } from './tooltip/index.ts'
export type { GooTurnstileFieldProps, GooTurnstileSize, GooTurnstileTheme } from './turnstile/index.ts'
export { GooTurnstileField } from './turnstile/index.ts'
export type { VirtualGridProps, VirtualGridSlot, VirtualGridWindow } from './virtualGrid/index.ts'
export { VirtualGrid } from './virtualGrid/index.ts'
export type { GooXyPadElement, GooXyPadEventData, GooXyPadProps, GooXyPadState, GooXyPadValue } from './xy-pad/index.ts'
export { GooXyPad } from './xy-pad/index.ts'
