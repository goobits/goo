import { describe, expect, it } from 'vitest'

import GooAngleInput from '../angle-input/GooAngleInput.svelte'
import { GooAngleInput as ExportedGooAngleInput } from '../angle-input/index.ts'
import GooButton from '../button/GooButton.svelte'
import { GooButton as ExportedGooButton } from '../button/index.ts'
import GooButtonGroup from '../button-group/GooButtonGroup.svelte'
import { GooButtonGroup as ExportedGooButtonGroup } from '../button-group/index.ts'
import GooCheckbox from '../checkbox/GooCheckbox.svelte'
import { GooCheckbox as ExportedGooCheckbox } from '../checkbox/index.ts'
import GooColor from '../color/GooColor.svelte'
import { GooColor as ExportedGooColor } from '../color/index.ts'
import GooDataGrid from '../data-grid/GooDataGrid.svelte'
import { GooDataGrid as ExportedGooDataGrid } from '../data-grid/index.ts'
import GooErrorBoundary from '../error-boundary/GooErrorBoundary.svelte'
import { GooErrorBoundary as ExportedGooErrorBoundary } from '../error-boundary/index.ts'
import GooInput from '../input/GooInput.svelte'
import GooNumber from '../input/GooNumber.svelte'
import { GooInput as ExportedGooInput, GooNumber as ExportedGooNumber } from '../input/index.ts'
import GooRadio from '../radio/GooRadio.svelte'
import GooRadioGroup from '../radio/GooRadioGroup.svelte'
import { GooRadio as ExportedGooRadio, GooRadioGroup as ExportedGooRadioGroup } from '../radio/index.ts'
import GooSelect from '../select/GooSelect.svelte'
import { GooSelect as ExportedGooSelect } from '../select/index.ts'
import GooTextarea from '../textarea/GooTextarea.svelte'
import { GooTextarea as ExportedGooTextarea } from '../textarea/index.ts'
import GooToast from '../toast/GooToast.svelte'
import GooToaster from '../toast/GooToaster.svelte'
import { GooToast as ExportedGooToast, GooToaster as ExportedGooToaster } from '../toast/index.ts'
import GooTurnstileField from '../turnstile/GooTurnstileField.svelte'
import { GooTurnstileField as ExportedGooTurnstileField } from '../turnstile/index.ts'

describe('Goo component exports', () => {
	it('exports Svelte components from their package subpaths', () => {
		expect(ExportedGooAngleInput).toBe(GooAngleInput)
		expect(ExportedGooButton).toBe(GooButton)
		expect(ExportedGooButtonGroup).toBe(GooButtonGroup)
		expect(ExportedGooCheckbox).toBe(GooCheckbox)
		expect(ExportedGooColor).toBe(GooColor)
		expect(ExportedGooDataGrid).toBe(GooDataGrid)
		expect(ExportedGooErrorBoundary).toBe(GooErrorBoundary)
		expect(ExportedGooInput).toBe(GooInput)
		expect(ExportedGooNumber).toBe(GooNumber)
		expect(ExportedGooRadio).toBe(GooRadio)
		expect(ExportedGooRadioGroup).toBe(GooRadioGroup)
		expect(ExportedGooSelect).toBe(GooSelect)
		expect(ExportedGooTextarea).toBe(GooTextarea)
		expect(ExportedGooToast).toBe(GooToast)
		expect(ExportedGooToaster).toBe(GooToaster)
		expect(ExportedGooTurnstileField).toBe(GooTurnstileField)
	})
})
