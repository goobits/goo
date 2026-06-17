# Svelte Controls

How to expose a Svelte editor as a GooSchema control.

## Steps

1. Build the Svelte component with a value prop and change callback.
2. Export a `controlSchema` describing the bindings.
3. Register the control type with an explicit config object.
4. Use the type name in your schema.

GooController owns the row wrapper, binding lifecycle, and imperative handle. Svelte controls should expose props and callbacks only; do not depend on controller private fields such as `_controlPromise`, `_control`, or `_destroyElement`. Imperative controls should use stable handle names such as `destroy()`, `setValue()`, `getValue()`, and `getRange()`.

## Component + controlSchema

```svelte
<!-- editors/my-picker/MyPicker.svelte -->
<script lang="ts">
interface Props {
  value: string
  options?: string[]
  disabled?: boolean
  onchange?: (value: string) => void
}

let { value, options = [], disabled = false, onchange }: Props = $props()
</script>
```

```ts
// editors/my-picker/index.ts
import type {
	ControlSchemaOptions,
	SvelteControlSchema
} from '../../controller/SvelteControl.svelte.ts'

export { default } from './MyPicker.svelte'
export const controlSchema: SvelteControlSchema = {
	valueKey: 'value',
	changeKey: 'onchange',
	propMapping: { options: 'options' }
}
```

## Register

```ts
// host-control-types.ts
import type { GooControlTypeRegistry } from '@goobits/goo/controller'

export const hostControlTypes: GooControlTypeRegistry = {
	'my-picker': { load: () => import('./editors/my-picker/index.ts'), svelte: true }
}
```

Non-Svelte controls must provide an explicit factory/class extractor instead of
relying on default exports or first-function module scans:

```ts
export const hostControlTypes: GooControlTypeRegistry = {
	'my-field': {
		load: () => import('./fields/myField.ts'),
		extract: module => module.createMyField,
		buildOptions: (value, options, onchange, oninput) => ({
			...options,
			value,
			onchange,
			oninput
		})
	}
}
```

## Use in schema

```ts
const schema = [{ path: 'selectedOption', type: 'my-picker', options: ['A', 'B', 'C'] }]

createGooSchema({ schema, data, controlTypes: hostControlTypes })
```

## SvelteControlSchema fields

```ts
interface SvelteControlSchema {
	valueKey?: string
	changeKey?: string
	inputKey?: string
	propMapping?: Record<string, string>
	transformValue?: (value: unknown, options: ControlSchemaOptions) => unknown
	transformOutput?: (output: unknown, options: ControlSchemaOptions) => unknown
	selfContained?: boolean
}
```

`selfContained` controls render their full row and bypass the normal GooController label/layout wrapper. Use it only for controls that own all of their visible UI.

## Built-in controls

Built-in Goo controls are registered in `src/controller/controlRegistry.ts`. Use `type: 'range-module'` for a native Goo slider with synced numeric inputs. Rich editor-specific controls live in `@goobits/goo-editors` and should be registered by the host package or app through its explicit control type map.

## Slider Feature Ownership

`GooSlider` owns primitive slider behavior. `GooRangeModule` composes `GooSlider`
with a label and synced number fields, and should pass slider behavior through
instead of duplicating it.

| Feature | Owner | Notes |
| --- | --- | --- |
| Single value | `GooSlider` | `mode="value"` is explicit; omitted mode still infers from value shape. |
| Range values | `GooSlider` | `mode="range"` or a two-value array. |
| Variance values | `GooSlider` | `mode="variance"` or legacy `variance: true`. Edge compression is shared with `GooRangeModule`. |
| Ticks / marks / labels | `GooSlider` | Use `ticks` and `marks`; `GooRangeModule` passes them through. |
| Snap points | `GooSlider` | Use `snap: true` for marks/ticks or `snap: number[]` for explicit points. |
| Scale mapping | `GooSlider` | `scale="linear"`, `"log"`, or `"exponential"`. Custom easing remains available for bespoke mappings. |
| Thumb distance constraints | `GooSlider` | Use `minDistance` and `maxDistance` for neighboring range thumbs. |
| Value bubble | `GooSlider` | Use `valueBubble: true` for active/hover/focus or `"always"` for persistent display. |
| Labels and number inputs | `GooRangeModule` | Field composition only; it does not own slider math or track rendering. |
