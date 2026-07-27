import { afterEach, describe, expect, it } from 'vitest'

import {
	type GooOverlayHost,
	portalToGooOverlayHost,
	resolveGooOverlayPlacement } from '../index.ts'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('Goo overlay host', () => {
	it('resolves the nearest app-owned overlay placement', () => {
		const scope = document.createElement('section')
		const content = document.createElement('main')
		const nestedScope = document.createElement('article')
		const host = document.createElement('div')
		const nestedHost = document.createElement('div')
		const anchor = document.createElement('button')
		scope.dataset.gooOverlayScope = ''
		nestedScope.dataset.gooOverlayScope = ''
		host.dataset.gooOverlayHost = ''
		nestedHost.dataset.gooOverlayHost = ''
		nestedScope.append(anchor, nestedHost)
		content.append(nestedScope)
		scope.append(content, host)
		document.body.append(scope)

		expect(resolveGooOverlayPlacement(anchor)).toEqual({
			host: nestedHost,
			scope: nestedScope
		})
	})

	it('portals content into the host and removes it on destroy', async() => {
		const source = document.createElement('div')
		const node = document.createElement('aside')
		const hostElement = document.createElement('div')
		source.append(node)
		document.body.append(source, hostElement)
		const host: GooOverlayHost = {
			element: () => hostElement,
			scope: () => source
		}

		const action = portalToGooOverlayHost(node, host)
		await Promise.resolve()

		expect(node.parentElement).toBe(hostElement)
		expect(node.hasAttribute('data-goo-overlay-portal')).toBe(true)

		action.destroy()

		expect(node.isConnected).toBe(false)
	})
})
