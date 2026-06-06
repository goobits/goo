# @goobits/goo

Reusable Svelte 5 UI components and small browser utilities. Goo is built around package subpath imports, CSS custom property theming, and controls that can be used from Svelte or imperative DOM code where the export supports it.

## TL;DR

- Install with `pnpm add @goobits/goo`.
- Import from component subpaths such as `@goobits/goo/button`, `@goobits/goo/select`, and `@goobits/goo/toast`.
- Theme with `--goo-theme-*` CSS variables.
- Programmatic value setters should stay silent; user input should emit `change` or `input`.
- Imperative factories return native HTML elements with documented Goo handle methods; avoid private underscore fields.

## Ownership Boundaries

- Goo owns generic primitives, layout shells, popouts, virtual grids, and `GooSchema`.
- Goo should not depend on Sketchpad globals, tool configs, document/layer state, assets, paint resources, or renderer APIs.
- Rich product/editor controls belong in `@goobits/goo-editors` when they are reusable across hosts.
- Model-agnostic workspace panels belong in `@goobits/goo-panels`; hosts provide data, persistence, commands, and renderer callbacks.
- Host-specific schema conversion belongs outside Goo; Sketchpad uses `@sketchapi/controls/sketch/config-pane`.
- Sketchpad custom tags and runtime DOM adapters belong in Sketchpad app/domain code. Goo components should expose Goo class names and generic HTML/Svelte surfaces.

## Install

```bash
pnpm add @goobits/goo
```

Goo expects Svelte 5 from the consumer:

```json
{
	"peerDependencies": {
		"svelte": "^5.55.5"
	}
}
```

## Local Development

```bash
pnpm install
pnpm run dev
pnpm run test
pnpm run check
pnpm run test:e2e
```

The e2e command starts a local Vite server and runs Playwright under `xvfb-run`.

## Basic Usage

```svelte
<script lang="ts">
	import { GooButton } from '@goobits/goo/button'
</script>

<GooButton variant="primary">Save</GooButton>
```

Use package subpaths in apps and shared packages so each caller names the surface it depends on.

## Public Subpaths

| Subpath                                | Main exports                                                       | Purpose                                    |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `@goobits/goo`                         | root barrel                                                        | Convenience aggregate for documented exports |
| `@goobits/goo/angle-input`             | `GooAngleInput`                                                    | Angle entry field                          |
| `@goobits/goo/button`                  | `GooButton`                                                        | Button component                           |
| `@goobits/goo/button/styles.css`       | CSS                                                                | Button-only stylesheet                     |
| `@goobits/goo/button-group`            | `GooButtonGroup`                                                   | Segmented button group                     |
| `@goobits/goo/button-group/styles.css` | CSS                                                                | Button-group-only stylesheet               |
| `@goobits/goo/checkbox`                | `GooCheckbox`                                                      | Checkbox component                         |
| `@goobits/goo/color`                   | `GooColor`                                                         | Color field component                      |
| `@goobits/goo/diff`                    | `DiffCanvas`, `compare`, `renderBinary`, `renderGradient`          | Image comparison UI and helpers            |
| `@goobits/goo/context-menu`            | `createGooContextMenu`, `GooContextMenu` manager                   | Imperative and registered context menus    |
| `@goobits/goo/controller`              | `createGooController`, `GooControlTypeRegistry`                    | Object-bound control creation              |
| `@goobits/goo/data-grid`               | `GooDataGrid`                                                      | Sortable tabular/grid UI                   |
| `@goobits/goo/dialog`                  | dialog helpers, `GooDialog` surface                                | Alert, confirm, prompt, and field dialogs  |
| `@goobits/goo/error-boundary`          | `GooErrorBoundary`                                                 | Svelte error boundary wrapper              |
| `@goobits/goo/focus-trap`              | `GooFocusTrap`                                                     | Modal focus trap wrapper                   |
| `@goobits/goo/floating-window`         | `createGooFloatingWindow`, `gooFloatingWindowRuntime`              | Floating window manager                    |
| `@goobits/goo/folder`                  | `GooFolder`                                                        | Collapsible folder controls                |
| `@goobits/goo/i18n`                    | `setLocale`, `translate`, `isRTL`, `onLocaleChange`                | Locale adapter utilities                   |
| `@goobits/goo/icon`                    | `GooIcon`, render helpers                                          | Registry-backed icons                      |
| `@goobits/goo/icon/registry`           | `iconRegistry`                                                     | Icon registry singleton                    |
| `@goobits/goo/input`                   | `GooInput`, `GooNumber`                                            | Text and number inputs                     |
| `@goobits/goo/input/styles.css`        | CSS                                                                | Input-only stylesheet                      |
| `@goobits/goo/label`                   | `GooLabel`                                                         | Label component                            |
| `@goobits/goo/number`                  | `formatNumber`, `clamp`, `toPercent`, `fromPercent`, `roundNumber` | Number utilities                           |
| `@goobits/goo/panel`                   | `GooPanel`                                                         | Inspector panel shell                      |
| `@goobits/goo/pointer`                 | `createPointerDrag`, `createPointerTap`, pointer event types       | Pointer drag and tap utilities             |
| `@goobits/goo/popout`                  | `GooPopout`, `createGooPopout`, `gooPopoutRuntime`                 | Popout positioning and lifecycle           |
| `@goobits/goo/positioning`             | `positionElementAt`, `calculatePosition`, positioning types        | Shared positioning math                    |
| `@goobits/goo/progress-ring`           | `GooProgressRing`, `createGooProgressRingTimer`                    | Progress ring and timer overlay            |
| `@goobits/goo/radio`                   | `GooRadio`, `GooRadioGroup`                                        | Radio controls                             |
| `@goobits/goo/range-module`            | `createRangeModuleField`                                           | Slider with synced numeric input fields    |
| `@goobits/goo/schema`                  | `GooSchema`, `createGooSchema`, schema types                       | Schema-driven control generation           |
| `@goobits/goo/select`                  | `GooSelect`                                                        | Select/menu component with submenu support |
| `@goobits/goo/select/styles.css`       | CSS                                                                | Select-only stylesheet                     |
| `@goobits/goo/slider`                  | `GooSlider`                                                        | Single and multi-thumb sliders             |
| `@goobits/goo/spinner`                 | `GooSpinner`, `renderGooSpinnerHtml`                               | Spinner component and HTML renderer        |
| `@goobits/goo/textarea`                | `GooTextarea`                                                      | Textarea component                         |
| `@goobits/goo/toast`                   | `GooToast`, `GooToaster`, `toast`                                  | Toast notification UI and service          |
| `@goobits/goo/tooltip`                 | `GooTooltip`, `tooltip`, `createGooTooltip`, `gooTooltipRuntime`   | Tooltip component and action/helper        |
| `@goobits/goo/turnstile`               | `GooTurnstileField`                                                | Cloudflare Turnstile field wrapper         |
| `@goobits/goo/virtualGrid`             | `VirtualGrid`, component types                                     | Virtualized grid primitive                 |
| `@goobits/goo/virtualGrid/model`       | selection, item, marquee, and windowing helpers                    | Virtual grid model utilities               |
| `@goobits/goo/vortex`                  | `createGooVortex`, `GooVortexManager`                              | Temporary positioned activity indicators   |

## Surface Stability

- Stable: component subpaths, `controller`, `schema`, `dialog`, `toast`, `popout`, `tooltip`, `i18n`, `number`, `pointer`, and `positioning`.
- Experimental: `diff`, `grid-popout`, `toolbar`, `virtualGrid/model`, and `vortex`; keep callers on documented exports and avoid reaching into source files.
- Internal: `src/support/*` helpers unless they are exposed through a named package subpath.

## Public Handles

Imperative Goo factories create ordinary HTML elements and attach a small public handle API. Use the documented methods such as `destroy()`, `setValue()`, `getValue()`, `updateDisplay()`, `updateOptions()`, `getRange()`, and `getController()` instead of reaching into underscore-prefixed implementation state or component-specific destroy aliases.

Use `createGooController()` and `createGooSchema()` for imperative controller/schema handles. Use the `GooSchema` Svelte component for markup. Use `createGooDialog()` for imperative dialogs. `GooSelect` internals such as keyboard and panel state are private to the package; public callers should use the component props, DOM events, or the exported element methods.

## Core Components

### Button

```svelte
<script lang="ts">
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
<script lang="ts">
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
<script lang="ts">
	import { GooCheckbox } from '@goobits/goo/checkbox'
</script>

<GooCheckbox label="Enable feature" />
<GooCheckbox label="Checked" checked />
```

### Input And Number

```svelte
<script lang="ts">
	import { GooInput, GooNumber } from '@goobits/goo/input'
</script>

<GooInput placeholder="Title" />
<GooInput type="password" placeholder="Password" />
<GooNumber value={50} min={0} max={100} step={1} />
```

### Textarea

```svelte
<script lang="ts">
	import { GooTextarea } from '@goobits/goo/textarea'
</script>

<GooTextarea placeholder="Notes" rows={4} />
```

### Radio

```svelte
<script lang="ts">
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

### Select

```svelte
<script lang="ts">
	import { GooSelect } from '@goobits/goo/select'

	const options = [
		{ id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
		{
			id: 'export',
			label: 'Export',
			type: 'submenu',
			options: [
				{ id: 'png', label: 'PNG' },
				{ id: 'svg', label: 'SVG' }
			]
		},
		{ type: 'divider' },
		{ id: 'delete', label: 'Delete' }
	]
</script>

<GooSelect {options} onchange={(id) => console.log(id)} />
```

### Slider

```svelte
<script lang="ts">
	import { GooSlider } from '@goobits/goo/slider'
</script>

<GooSlider value={50} min={0} max={100} />
<GooSlider value={[20, 80]} canPush />
<GooSlider preset="hue" min={0} max={360} />
<GooSlider preset="opacity" presetColor="#ff0000" />
```

### Range Module

```ts
import { createRangeModuleField } from '@goobits/goo/range-module'

const range = createRangeModuleField({
	value: 24,
	min: 1,
	max: 100,
	step: 1,
	unit: 'px',
	oninput: (value) => {
		console.log(value)
	}
})

document.body.appendChild(range)
```

### Angle Input

```svelte
<script lang="ts">
	import { GooAngleInput } from '@goobits/goo/angle-input'
</script>

<GooAngleInput value={45} />
```

### Color

```svelte
<script lang="ts">
	import { GooColor } from '@goobits/goo/color'
</script>

<GooColor value="#3b82f6" />
<GooColor value="#ff0000" alpha />
```

### Label

```svelte
<script lang="ts">
	import { GooLabel } from '@goobits/goo/label'
</script>

<GooLabel for="name">Name</GooLabel>
```

## Layout And Inspector Controls

### Panel And Folder

```svelte
<script lang="ts">
	import { GooFolder } from '@goobits/goo/folder'
	import { GooPanel } from '@goobits/goo/panel'
</script>

<GooPanel title="Settings" position="top-right">
	<GooFolder title="Transform" open>
		<!-- controls -->
	</GooFolder>
</GooPanel>
```

### Controller

```ts
import { createGooController } from '@goobits/goo/controller'

const model = { size: 12, color: '#3b82f6', enabled: true }

createGooController(model, 'size', { min: 1, max: 64 })
createGooController(model, 'color', { type: 'color' })
createGooController(model, 'enabled')
```

Controllers return native elements with chainable public methods such as `name()`, `min()`, `max()`, `step()`, `listen()`, `stopListening()`, `updateDisplay()`, `updateOptions()`, `setValue()`, `getValue()`, `addTo()`, and `destroy()`. Tests and host integrations should wait for the rendered inner control through public DOM/control state rather than `_controlPromise`.

### Schema

```svelte
<script lang="ts">
	import { GooSchema } from '@goobits/goo/schema'

	const data = { name: 'Preset', enabled: true, size: 24 }
	const schema = [
		{ path: 'name', type: 'text', label: 'Name' },
		{ path: 'enabled', type: 'checkbox', label: 'Enabled' },
		{ path: 'size', type: 'range-module', min: 1, max: 100, label: 'Size' }
	]
</script>

<GooSchema {schema} {data} />
```

Custom GooSchema controls register Svelte modules through `@goobits/goo/controller` control type maps. See `docs/svelte-controls.md` for the `controlSchema` contract, including self-contained editor controls that opt out of GooController row wrapping.

Imperative schema callers can use `createGooSchema()` to receive a native element with `setSchema()`, `setData()`, `setOptions()`, `getSchema()`, `getData()`, `getController()`, `refreshConditions()`, `refresh()`, and `destroy()`.

## Overlay And Feedback

### Dialog

```ts
import { GooAlert, GooConfirm, GooPrompt } from '@goobits/goo/dialog'

await GooAlert('Saved').result
const confirm = await GooConfirm('Delete this item?').result
const prompt = await GooPrompt({
	fields: [{ type: 'text', name: 'name', label: 'Name' }]
}).result
```

`createGooDialog()` returns a public controller handle with `element`, `open()`, `close()`, and `setContent()`. Use `controller.element` for DOM events, attributes, and queries; header/content/footer nodes are implementation details.

### Popout

```ts
import { createGooPopout } from '@goobits/goo/popout'

const popout = createGooPopout({
	$content: menuElement,
	at: button,
	align: 'top left to bottom left',
	openImmediately: false
})

await popout.open()
```

### Floating Window

```ts
import { createGooFloatingWindow } from '@goobits/goo/floating-window'

const inspector = document.createElement('section')
const handle = document.createElement('header')
inspector.append(handle)

const win = createGooFloatingWindow({
	id: 'inspector',
	element: inspector,
	handle,
	position: 'top right'
})

win.show()
```

### Context Menu

```ts
import { createGooContextMenu } from '@goobits/goo/context-menu'

const menu = createGooContextMenu({
	options: [
		{ id: 'copy', label: 'Copy', onChoose: (id) => console.log(id) },
		{ id: 'delete', label: 'Delete', onChoose: (id) => console.log(id) }
	]
})

targetElement.addEventListener('contextmenu', (event) => {
	event.preventDefault()
	menu.open({ x: event.clientX, y: event.clientY })
})
```

Use `GooContextMenu.register()`, `GooContextMenu.open()`, and `GooContextMenu.close()` for app-wide registered menus.

### Tooltip

```svelte
<script lang="ts">
	import { tooltip } from '@goobits/goo/tooltip'
</script>

<button use:tooltip={{ content: 'Create a new item' }}>New</button>
```

### Toast

```svelte
<script lang="ts">
	import { GooToaster, toast } from '@goobits/goo/toast'
</script>

<GooToaster position="bottom-right" />
<button onclick={() => toast.success('Saved')}>Save</button>
```

### Spinner

```svelte
<script lang="ts">
	import { GooSpinner } from '@goobits/goo/spinner'
</script>

<GooSpinner size="md" variant="rainbow" label="Loading" />
```

For string-template or non-Svelte callers:

```ts
import { renderGooSpinnerHtml } from '@goobits/goo/spinner'

container.innerHTML = renderGooSpinnerHtml({ size: 'sm', label: 'Loading' })
```

### Progress Ring

```svelte
<script lang="ts">
	import { GooProgressRing } from '@goobits/goo/progress-ring'
</script>

<GooProgressRing progress={0.75} showText />
```

Imperative timer:

```ts
import { createGooProgressRingTimer } from '@goobits/goo/progress-ring'

const timer = createGooProgressRingTimer({ parentNode: document.body, showText: true })
timer.show()
timer.setProgress(0.5)
timer.element.dataset.loading = 'true'
timer.hide()
```

### Error Boundary

```svelte
<script lang="ts">
	import { GooErrorBoundary } from '@goobits/goo/error-boundary'
</script>

<GooErrorBoundary>
	<RiskyPanel />
</GooErrorBoundary>
```

### Turnstile

```svelte
<script lang="ts">
	import { GooTurnstileField } from '@goobits/goo/turnstile'
</script>

<GooTurnstileField siteKey={PUBLIC_TURNSTILE_SITE_KEY} action="signup" />
```

Turnstile site keys are public. Server-side verification still belongs in the consuming app.

### Vortex

```ts
import { createGooVortex } from '@goobits/goo/vortex'

const vortex = createGooVortex(document.body)
vortex.create({ id: 'save', point: { x: 100, y: 100 }, message: 'Saving' })
vortex.destroy('save')
```

## Data Display

### Data Grid

```svelte
<script lang="ts">
	import { GooDataGrid } from '@goobits/goo/data-grid'

	const columns = [
		{ key: 'name', label: 'Name', value: row => row.name },
		{ key: 'status', label: 'Status', value: row => row.status }
	]
	const rows = [
		{ id: '1', name: 'Document', status: 'Ready' }
	]
</script>

<GooDataGrid {columns} {rows} />
```

### Virtual Grid

```svelte
<script lang="ts">
	import { VirtualGrid } from '@goobits/goo/virtualGrid'

	let scrollRoot: HTMLElement
</script>

<section bind:this={scrollRoot}>
	<VirtualGrid {items} {scrollRoot}>
		{#snippet children(slot)}
			<div class="thumb">{slot.item?.name}</div>
		{/snippet}
	</VirtualGrid>
</section>
```

## Icons

Register app-owned SVGs once, then render them by name:

```ts
import { iconRegistry } from '@goobits/goo/icon/registry'

iconRegistry.register('save', '<svg viewBox="0 0 24 24">...</svg>')
```

```svelte
<script lang="ts">
	import { GooIcon } from '@goobits/goo/icon'
</script>

<GooIcon value="save" label="Save" />
```

For server or string-template rendering:

```ts
import {
	renderIconHtml,
	renderIconPlaceholderHtml,
	renderIconPlaceholders
} from '@goobits/goo/icon'
```

## Image Diff

```svelte
<script lang="ts">
	import { DiffCanvas } from '@goobits/goo/diff'
</script>

<DiffCanvas {imageA} {imageB} />
```

```ts
import { compare, renderGradient } from '@goobits/goo/diff'

const result = compare(canvasA, canvasB)
const visualization = renderGradient(result)
```

## Utilities

### Positioning

```ts
import { positionElementAt } from '@goobits/goo/positioning'

positionElementAt(popout, {
	at: anchor,
	align: 'top left to bottom left',
	keepWithin: { $element: document.body, margin: 8 }
})
```

### Number Helpers

```ts
import { clamp, formatNumber, fromPercent, roundNumber, toPercent } from '@goobits/goo/number'
```

### Pointer Drag

The root entrypoint exports the shared pointer-drag helper from `src/support/utils/pointerDrag.ts` for controls that need consistent pointer capture behavior.

### Locale

```ts
import { getLocale, isRTL, onLocaleChange, setLocale, translate } from '@goobits/goo/i18n'

setLocale({
	rtl: document.dir === 'rtl',
	locale: navigator.language,
	translate: (key) => key
})

const unsubscribe = onLocaleChange(() => {
	console.log(getLocale(), isRTL(), translate('label.save'))
})
```

## Theming

Goo components read CSS custom properties from the current DOM tree. Define the variables globally, per app shell, or on a scoped panel.

```css
:root {
	--goo-theme-bg: #ffffff;
	--goo-theme-fg: #111827;
	--goo-theme-muted: rgba(17, 24, 39, 0.6);
	--goo-theme-text-disabled: rgba(17, 24, 39, 0.35);
	--goo-theme-surface: #ffffff;
	--goo-theme-surface-raised: #f9fafb;
	--goo-theme-surface-sunken: #f3f4f6;
	--goo-theme-border: rgba(17, 24, 39, 0.14);
	--goo-theme-border-subtle: rgba(17, 24, 39, 0.08);
	--goo-theme-accent: #2563eb;
	--goo-theme-accent-fg: #ffffff;
	--goo-theme-selected: #dbeafe;
	--goo-theme-selected-fg: #1e3a8a;
	--goo-theme-positive: #16a34a;
	--goo-theme-positive-fg: #ffffff;
	--goo-theme-negative: #dc2626;
	--goo-theme-negative-fg: #ffffff;
	--goo-theme-warning: #f59e0b;
	--goo-theme-warning-fg: #111827;
	--goo-theme-secondary: #7c3aed;
	--goo-theme-secondary-fg: #ffffff;
	--goo-theme-focus-ring: rgba(37, 99, 235, 0.4);
}
```

Core components should use this contract directly:

| Group | Tokens |
| ----- | ------ |
| Text | `--goo-theme-fg`, `--goo-theme-muted`, `--goo-theme-text-disabled` |
| Surfaces | `--goo-theme-bg`, `--goo-theme-surface`, `--goo-theme-surface-raised`, `--goo-theme-surface-sunken` |
| Borders | `--goo-theme-border`, `--goo-theme-border-subtle`, `--goo-theme-focus-ring` |
| Accent/selection | `--goo-theme-accent`, `--goo-theme-accent-fg`, `--goo-theme-selected`, `--goo-theme-selected-fg` |
| Status | `--goo-theme-positive`, `--goo-theme-positive-fg`, `--goo-theme-negative`, `--goo-theme-negative-fg`, `--goo-theme-warning`, `--goo-theme-warning-fg` |
| Secondary | `--goo-theme-secondary`, `--goo-theme-secondary-fg` |
| Radius/space/type | `--goo-theme-radius-sm/md/lg/xl/full`, `--goo-theme-space-xs/sm/md/lg/xl`, `--goo-theme-font-size-xs/sm/md/lg/xl` |

Hover, active, and subtle accent backgrounds are derived at the component site:

```css
background: color-mix(in srgb, var(--goo-theme-fg) 8%, transparent);
background: color-mix(in srgb, var(--goo-theme-fg) 15%, transparent);
background: color-mix(in srgb, var(--goo-theme-accent) 18%, transparent);
```

Do not add legacy aliases such as `--goo-theme-fg-muted`, `--goo-theme-fg-secondary`,
`--goo-theme-bg-elevated`, `--goo-theme-bg-hover`, `--goo-theme-bg-active`,
`--goo-theme-accent-subtle`, or `--goo-theme-radius-xs`.

For muted text on a colored background, mix the foreground token instead of using the base muted token:

```css
color: color-mix(in srgb, var(--goo-theme-accent-fg) 70%, transparent);
```

## Component Guidelines

- Value setters should be silent: setting `.value` from code should not emit `change` or `input`.
- User input should emit the appropriate event once.
- Prefer `setValue(value, { silent: true })` inside value setters.
- Guard no-op updates before writing DOM state.
- Keep reusable UI in Goo; keep app-specific wiring in the consuming app or domain package.

## Verification

```bash
pnpm run test
pnpm run check
pnpm run test:e2e
```

## License

MIT
