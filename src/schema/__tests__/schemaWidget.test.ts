import { describe, expect, it } from 'vitest'

import { defineGooSchemaWidget } from '../schemaWidget.ts'

describe('defineGooSchemaWidget', () => {
	it('applies portable widget defaults and preserves schema options', () => {
		expect(defineGooSchemaWidget('paint-destination', {
			if: '__ui.paintDestinationAvailable'
		})).toEqual({
			if: '__ui.paintDestinationAvailable',
			layout: 'self-contained',
			showLabel: false,
			type: 'widget',
			widget: 'paint-destination'
		})
	})
})
