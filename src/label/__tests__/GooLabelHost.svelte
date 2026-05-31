<script lang="ts">
import GooLabel from '../GooLabel.svelte'

interface Props {
	forId?: string
	required?: boolean
	disabled?: boolean
	text?: string
}

let {
	forId = '',
	required = false,
	disabled = false,
	text = 'Label'
}: Props = $props()
</script>

<GooLabel for={forId} {required} {disabled}>{text}</GooLabel>
