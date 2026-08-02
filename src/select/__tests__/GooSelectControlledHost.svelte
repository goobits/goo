<script lang="ts">
import GooSelect from '../GooSelect.svelte'

let value = $state('a')
</script>

<GooSelect
	{value}
	options={[
		{ id: 'a', label: 'A' },
		{ id: 'b', label: 'B' }
	]}
	onchange={nextValue => {
		value = nextValue
	}}
/>
