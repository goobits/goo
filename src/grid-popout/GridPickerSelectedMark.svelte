<script lang="ts">
import Check from '@lucide/svelte/icons/check'

import './gridPickerSelectedMark.css'
import { GRID_PICKER_SELECTED_MARK_CLASS, GRID_PICKER_SELECTED_MARK_ICON_CLASS } from './gridPickerSelectedMark.ts'

interface Props {
	className?: string
}

let { className = '' }: Props = $props()

const selectedMarkClassName = $derived([
	GRID_PICKER_SELECTED_MARK_CLASS,
	className
].filter(Boolean).join(' '))
</script>

<span class={selectedMarkClassName} aria-hidden="true">
	<Check class={GRID_PICKER_SELECTED_MARK_ICON_CLASS} />
</span>
