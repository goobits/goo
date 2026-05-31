# Svelte Controls

How to expose a Svelte editor as a GooSchema control.

## Steps

1. Build the Svelte component with a value prop and change callback.
2. Export a `controlSchema` describing the bindings.
3. Register the control type in `controller/controlRegistry.ts`.
4. Use the type name in your schema.

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
import type { SvelteControlSchema } from '../../controller/svelteControlWrapper.ts'

export { default } from './MyPicker.svelte'
export const controlSchema: SvelteControlSchema = {
	valueKey: 'value',
	changeKey: 'onchange',
	propMapping: { options: 'options' }
}
```

## Register

```ts
// controller/controlRegistry.ts
'my-picker': svelteControl(() => import('../editors/my-picker/index.ts'))
```

## Use in schema

```ts
const schema = [{ path: 'selectedOption', type: 'my-picker', options: ['A', 'B', 'C'] }]
```

## SvelteControlSchema fields

```ts
interface SvelteControlSchema {
	valueKey?: string
	changeKey?: string
	propMapping?: Record<string, string>
	transformValue?: (value: any, options: any) => any
	transformOutput?: (output: any, options: any) => any
}
```

## Built-in Svelte controls

- `blend-picker`
- `color-list`
