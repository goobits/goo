import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import GooWaveform from '../GooWaveform.svelte'

const measuredBars = [
	{ amplitude: 0.25, color: 'hsl(210 42% 42%)' },
	{ amplitude: 0.5, color: 'hsl(160 50% 45%)' },
	{ amplitude: 0.75, color: 'hsl(40 60% 55%)' },
	{ amplitude: 1, color: 'hsl(15 70% 55%)' }
]

describe('GooWaveform', () => {
	it('renders measured amplitudes and colors through the requested preset', () => {
		const { container } = render(GooWaveform, {
			props: {
				bars: measuredBars,
				class: 'host-waveform',
				variant: 'compact'
			}
		})
		const root = container.querySelector<HTMLElement>('.goo-waveform')!
		const bars = [ ...root.querySelectorAll<SVGRectElement>('rect') ]

		expect(root.classList).toContain('goo-waveform--compact')
		expect(root.classList).toContain('host-waveform')
		expect(root.dataset.waveformSource).toBe('analysis')
		expect(bars).toHaveLength(4)
		expect(Number(bars[0]?.getAttribute('height'))).toBeCloseTo(23.5)
		expect(Number(bars[3]?.getAttribute('height'))).toBe(94)
		expect(new Set(bars.map(bar => bar.style.fill)).size).toBe(4)
	})

	it('shows progress through emphasis without replacing measured colors', () => {
		const { container } = render(GooWaveform, {
			props: { bars: measuredBars, progress: 0.5 }
		})
		const bars = [ ...container.querySelectorAll<SVGRectElement>('rect') ]

		expect(bars.map(bar => bar.dataset.played)).toEqual([ 'true', 'true', 'false', 'false' ])
		expect(bars[0]?.classList).toContain('goo-waveform__bar--played')
		expect(bars[2]?.classList).toContain('goo-waveform__bar--remaining')
		expect(new Set(bars.map(bar => bar.style.fill)).size).toBe(4)
	})

	it('keeps missing measurements honest', () => {
		const { container } = render(GooWaveform, {
			props: { bars: [], variant: 'mini', 'data-testid': 'waveform' }
		})
		const root = container.querySelector<HTMLElement>('.goo-waveform')!

		expect(root.classList).toContain('goo-waveform--mini')
		expect(root.dataset.waveformSource).toBe('unavailable')
		expect(root.dataset.testid).toBe('waveform')
		expect(root.querySelector('rect')).toBeNull()
	})

	it('drops non-finite bars and clamps finite amplitudes', () => {
		const { container } = render(GooWaveform, {
			props: {
				bars: [
					{ amplitude: Number.NaN },
					{ amplitude: -1 },
					{ amplitude: 2 }
				]
			}
		})
		const bars = [ ...container.querySelectorAll<SVGRectElement>('rect') ]

		expect(bars).toHaveLength(2)
		expect(Number(bars[0]?.getAttribute('height'))).toBe(6)
		expect(Number(bars[1]?.getAttribute('height'))).toBe(94)
	})
})
