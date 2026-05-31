interface PresetConfig {

	/** CSS class applied for the preset. */
	className: string
}

/** Available preset names for Goo slider. */
export const sliderPresets = {
	OPACITY: 'opacity',
	HUE: 'hue',
	SATURATION: 'saturation',
	LIGHTNESS: 'lightness',
	BRIGHTNESS: 'brightness',
	BIPOLAR: 'bipolar',
	SIZE: 'size'
} as const

/** Slider preset class configuration. */
export const sliderPresetConfigs: Record<string, PresetConfig> = {
	opacity: { className: 'goo-slider--opacity' },
	hue: { className: 'goo-slider--hue' },
	saturation: { className: 'goo-slider--saturation' },
	lightness: { className: 'goo-slider--lightness' },
	brightness: { className: 'goo-slider--brightness' },
	bipolar: { className: 'goo-slider--bipolar' },
	size: { className: 'goo-slider--size' }
}

/** Slider shape class configuration. */
export const sliderShapes = {
	wedge: { className: 'goo-slider--wedge' },
	'wedge-left': { className: 'goo-slider--wedge-left' }
} as const
