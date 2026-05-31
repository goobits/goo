<script lang="ts">
import { GooButton } from '../button/index.ts'
import { GooDialog } from '../dialog/index.ts'
import { GooFolder } from '../folder/index.ts'
import { GooPanel } from '../panel/index.ts'
import { GooPopout } from '../popout/index.ts'
import type { GooPopoutInstance } from '../popout/index.ts'

let buttonPressed = $state(false)
let dialogOpen = $state(false)
let folderOpen = $state(true)
let panelOpen = $state(true)
let popoutOpen = $state(true)
let popoutInstance = $state<GooPopoutInstance | null>(null)
</script>

<button id="bindable-popout-target" type="button">Target</button>
<button data-testid="close-popout" type="button" onclick={() => { void popoutInstance?.close() }}>Close popout</button>
<button data-testid="open-dialog" type="button" onclick={() => { dialogOpen = true }}>Open dialog</button>

<GooButton bind:pressed={buttonPressed} toggle value="Toggle" />
<GooDialog bind:open={dialogOpen} heading="Dialog">Dialog body</GooDialog>
<GooFolder bind:open={folderOpen} title="Folder">Folder body</GooFolder>
<GooPanel bind:open={panelOpen} title="Panel">Panel body</GooPanel>
<GooPopout bind:instance={popoutInstance} bind:open={popoutOpen} target="bindable-popout-target">Popout body</GooPopout>

<output data-testid="button-pressed">{String(buttonPressed)}</output>
<output data-testid="dialog-open">{String(dialogOpen)}</output>
<output data-testid="folder-open">{String(folderOpen)}</output>
<output data-testid="panel-open">{String(panelOpen)}</output>
<output data-testid="popout-open">{String(popoutOpen)}</output>
