// @vitest-environment node

import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import GooWaveform from '../GooWaveform.svelte'

describe('GooWaveform SSR', () => {
	it('renders measured and unavailable states without browser globals', () => {
		const measured = render(GooWaveform, {
			props: {
				bars: [ { amplitude: 0.75, color: 'hsl(210 42% 42%)' } ],
				variant: 'detail'
			}
		}).body
		const unavailable = render(GooWaveform, {
			props: { bars: [], variant: 'mini' }
		}).body

		expect(measured).toContain('data-waveform-source="analysis"')
		expect(measured).toContain('<rect')
		expect(measured).toContain('hsl(210 42% 42%)')
		expect(unavailable).toContain('data-waveform-source="unavailable"')
		expect(unavailable).not.toContain('<rect')
	})
})
