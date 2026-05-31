# @goobits/goo

Svelte 5 UI component library with CSS custom property theming for SketchAPI apps and tools.

## TL;DR

- Install with `pnpm add @goobits/goo`, import from per-component subpaths like `@goobits/goo/button`.
- Covers buttons, inputs, sliders, checkboxes, selects, dialogs, color swatches, and angle inputs.
- Includes a panel/folder system for object-bound inspector controls.
- Theme via `--goo-theme-*` CSS variables; use `GooTheme` from `@goobits/themes` to manage presets.

## Usage

```bash
pnpm add @goobits/goo
```

```svelte
<script>
	import { GooButton } from '@goobits/goo/button'
</script>

<GooButton variant="primary">Click</GooButton>
```

## Components

| Component                    | Import                      | Element                     |
| ---------------------------- | --------------------------- | --------------------------- |
| [Button](#button)            | `@goobits/goo/button`       | `GooButton`                 |
| [ButtonGroup](#button-group) | `@goobits/goo/button-group` | `GooButtonGroup`            |
| [Checkbox](#checkbox)        | `@goobits/goo/checkbox`     | `GooCheckbox`               |
| [Color](#color)              | `@goobits/goo/color`        | `GooColor`                  |
| [Dialog](#dialog)            | `@goobits/goo/dialog`       | `.goo-dialog`               |
| [Input](#input)              | `@goobits/goo/input`        | `GooInput`, `GooNumber`     |
| [Radio](#radio)              | `@goobits/goo/radio`        | `GooRadio`, `GooRadioGroup` |
| [Slider](#slider)            | `@goobits/goo/slider`       | `GooSlider`                 |
| [Select](#select)            | `@goobits/goo/select`       | `GooSelect`                 |
| [Textarea](#textarea)        | `@goobits/goo/textarea`     | `GooTextarea`               |
| [AngleInput](#angle-input)   | `@goobits/goo/angle-input`  | `GooAngleInput`             |

## Component Guidelines

- Value setters should be silent (no change events). Only user input should emit `change`/`input`.
- Prefer `setValue(val, { silent: true })` in `set value(...)`, and guard against no-op updates in `setValue`.

### Button

```svelte
<script>
	import { GooButton } from '@goobits/goo/button'
</script>

<GooButton>Default</GooButton>
<GooButton variant="primary">Primary</GooButton>
<GooButton variant="secondary">Secondary</GooButton>
<GooButton variant="danger">Danger</GooButton>
<GooButton variant="ghost">Ghost</GooButton>
<GooButton disabled>Disabled</GooButton>
```

### Button Group

```svelte
<script>
	import { GooButtonGroup } from '@goobits/goo/button-group'
</script>

<GooButtonGroup
	value="b"
	options={[
		{ key: 'a', value: 'A' },
		{ key: 'b', value: 'B' },
		{ key: 'c', value: 'C' }
	]}
/>
```

### Checkbox

```svelte
<script>
	import { GooCheckbox } from '@goobits/goo/checkbox'
</script>

<GooCheckbox label="Enable feature" />
<GooCheckbox label="Checked" checked />
```

### Color

```svelte
<GooColor value="#3b82f6" />
<GooColor value="#ff0000" alpha />
```

### Dialog

```js
import { GooAlert, GooConfirm, GooPrompt } from '@goobits/goo/dialog'

GooAlert('Hello!')
GooConfirm('Are you sure?').then(({ ok }) => {})
GooPrompt({ fields: [{ type: 'text', name: 'name', label: 'Name' }] }).then(({ values }) => {})
```

### Input

```svelte
<script>
	import { GooInput, GooNumber } from '@goobits/goo/input'
</script>

<GooInput placeholder="Text..." />
<GooNumber value={50} min={0} max={100} step={1} />
```

### Radio

```svelte
<script>
	import { GooRadioGroup } from '@goobits/goo/radio'
</script>

<GooRadioGroup
	name="size"
	value="md"
	options={[
		{ value: 'sm', label: 'Small' },
		{ value: 'md', label: 'Medium' },
		{ value: 'lg', label: 'Large' }
	]}
/>
```

### Slider

```svelte
<script>
	import { GooSlider } from '@goobits/goo/slider'
</script>

<GooSlider value={50} min={0} max={100} />
<GooSlider value={[20, 80]} canPush />
<GooSlider preset="hue" min={0} max={360} />
<GooSlider preset="opacity" presetColor="#ff0000" />
```

For labeled sliders with number input, use `SliderEditor` from `@goobits/goo-editors`.

### Select

```svelte
<script>
	import { GooSelect } from '@goobits/goo/select'

	const options = [
		{ id: 'a', label: 'Option A' },
		{ id: 'b', label: 'Option B', shortcut: '⌘B' },
		{ type: 'divider' },
		{ id: 'c', label: 'Option C' }
	]
</script>

<GooSelect {options} onchange={(id) => console.log(id)} />
```

### Textarea

```svelte
<script>
	import { GooTextarea } from '@goobits/goo/textarea'
</script>

<GooTextarea placeholder="Enter text..." rows={4} />
```

### Angle Input

```svelte
<script>
	import { GooAngleInput } from '@goobits/goo/angle-input'
</script>

<GooAngleInput value={45} />
```

---

## Panel System

Object-bound controls for tool panels and inspectors:

```svelte
<script>
	import { onMount, tick } from 'svelte'
	import { GooPanel } from '@goobits/goo/panel'
	import { GooFolder } from '@goobits/goo/folder'
	import { createGooController } from '@goobits/goo/controller'

	const obj = { x: 0, y: 0, scale: 1, color: '#ff0000', enabled: true }
	let transformFolder = $state(null)

	onMount(() => {
		void tick().then(() => {
			if (!transformFolder) return
			createGooController(obj, 'x', { min: -100, max: 100 }).addTo(transformFolder)
			createGooController(obj, 'scale', { min: 0.1, max: 2, step: 0.1 }).addTo(transformFolder)
			createGooController(obj, 'color', { type: 'color' }).addTo(transformFolder)
			createGooController(obj, 'enabled').addTo(transformFolder)
		})
	})
</script>

<GooPanel title="Settings" position="top-right">
	<GooFolder bind:element={transformFolder} title="Transform" open />
</GooPanel>
```

---

## Theming

All components use `--goo-theme-*` CSS variables.

```js
import { GooTheme } from '@goobits/themes'

GooTheme.init({ initial: 'dark', persist: true })
GooTheme.set('accent', '#3b82f6')
GooTheme.preset('nord') // or: dark, light, dracula, monokai, solarized
GooTheme.auto() // follow system preference
```

### Core Variables

```css
/* Background/Foreground */
--goo-theme-bg              /* background */
--goo-theme-fg              /* primary text (100%) */
--goo-theme-muted           /* secondary/muted text (50%) */
--goo-theme-text-disabled   /* disabled text (25%) */

/* Surfaces */
--goo-theme-surface         /* same as bg */
--goo-theme-surface-raised  /* elevated surfaces */
--goo-theme-surface-sunken  /* recessed surfaces */

/* Borders */
--goo-theme-border          /* standard border */
--goo-theme-border-subtle   /* subtle border */
```

### Accent & Selection (paired bg → fg)

```css
--goo-theme-accent       /* primary accent bg */
--goo-theme-accent-fg    /* text ON accent */
--goo-theme-selected     /* selected item bg */
--goo-theme-selected-fg  /* text ON selected */
```

For muted text on colored backgrounds, use `color-mix()`:

```css
color: color-mix(in srgb, var(--goo-theme-accent-fg) 70%, transparent);
```

### Status Colors

```css
--goo-theme-positive     /* success (has -fg pair) */
--goo-theme-negative     /* error (has -fg pair) */
--goo-theme-warning      /* warning (has -fg pair) */
--goo-theme-secondary    /* secondary accent (has -fg pair) */
```

---

## License

MIT
