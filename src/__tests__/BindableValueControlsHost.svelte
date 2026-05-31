<script lang="ts">
import { GooAngleInput } from '../angle-input/index.ts'
import { GooButtonGroup } from '../button-group/index.ts'
import { GooColor } from '../color/index.ts'
import { GooRadio, GooRadioGroup } from '../radio/index.ts'
import { GooSlider } from '../slider/index.ts'

let angleValue = $state(0)
let buttonGroupValue = $state<string | string[] | null>('left')
let colorValue = $state('#ff0000')
let radioChecked = $state(false)
let radioGroupValue = $state('one')
let sliderValue = $state<number | number[]>(10)

const buttonOptions = [ 'left', 'right' ]
const radioOptions = [
	{ value: 'one', label: 'One' },
	{ value: 'two', label: 'Two' }
]
</script>

<GooAngleInput bind:value={angleValue} />
<GooButtonGroup bind:value={buttonGroupValue} options={buttonOptions} />
<GooColor bind:value={colorValue} />
<GooRadio bind:checked={radioChecked} value="solo" label="Solo" />
<GooRadioGroup bind:value={radioGroupValue} options={radioOptions} />
<GooSlider bind:value={sliderValue} min={0} max={100} />

<output data-testid="angle-value">{angleValue}</output>
<output data-testid="button-group-value">{buttonGroupValue}</output>
<output data-testid="color-value">{colorValue}</output>
<output data-testid="radio-checked">{String(radioChecked)}</output>
<output data-testid="radio-group-value">{radioGroupValue}</output>
<output data-testid="slider-value">{Array.isArray(sliderValue) ? sliderValue.join(',') : sliderValue}</output>
