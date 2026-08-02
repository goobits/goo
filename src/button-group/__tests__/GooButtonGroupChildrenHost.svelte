<script lang="ts">
	import GooButton from '../../button/GooButton.svelte'
	import GooButtonGroup from '../GooButtonGroup.svelte'

	let value = $state('tree')
</script>

<GooButtonGroup
	{value}
	onchange={(nextValue) => {
		if (typeof nextValue === 'string') value = nextValue
	}}
>
	<GooButton data-id="tree">Tree view</GooButton>
	<GooButton data-id="table">Table view</GooButton>
</GooButtonGroup>

<output data-testid="button-group-child-value">{value}</output>
