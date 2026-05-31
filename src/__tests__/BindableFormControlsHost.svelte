<script lang="ts">
import { GooCheckbox } from '../checkbox/index.ts'
import { GooInput, GooNumber } from '../input/index.ts'
import { GooSelect } from '../select/index.ts'
import { GooTextarea } from '../textarea/index.ts'

let inputValue = $state('alpha')
let numberValue = $state(2)
let textareaValue = $state('draft')
let selectValue = $state('a')
let checkboxChecked = $state(false)
let checkboxValue = $state(false)

const selectOptions = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Beta' }
]
</script>

<form data-testid="form">
	<GooInput bind:value={inputValue} name="input-field" />
	<GooNumber bind:value={numberValue} name="number-field" />
	<GooTextarea bind:value={textareaValue} name="textarea-field" />
	<GooSelect bind:value={selectValue} name="select-field" options={selectOptions} />
	<GooCheckbox bind:checked={checkboxChecked} bind:value={checkboxValue} name="checkbox-field" formValue="yes" />
</form>

<output data-testid="input-value">{inputValue}</output>
<output data-testid="number-value">{numberValue}</output>
<output data-testid="textarea-value">{textareaValue}</output>
<output data-testid="select-value">{selectValue}</output>
<output data-testid="checkbox-checked">{String(checkboxChecked)}</output>
<output data-testid="checkbox-value">{String(checkboxValue)}</output>
