import { render } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'

import {
	type GooOverlayHost,
	portalToGooOverlayHost,
	resolveGooOverlayPlacement
} from '../index.ts'
import OverlayHostContextHost from './OverlayHostContextHost.svelte'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('Goo overlay host', () => {
	it('provides the app-owned host through Svelte context', () => {
		const host: GooOverlayHost = {
			element: () => document.body,
			scope: () => document.body
		}
		const view = render(OverlayHostContextHost, { props: { host } })

		expect(view.component.readProvidedHost()).toBe(host)
		expect(view.component.readConsumedHost()).toBe(host)
	})

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

	it('portals content into a ready host synchronously and removes it on destroy', () => {
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

		expect(node.parentElement).toBe(hostElement)
		expect(node.hasAttribute('data-goo-overlay-portal')).toBe(true)

		action.destroy()

		expect(node.isConnected).toBe(false)
	})

	it('retries a host that binds after the portal action mounts', async() => {
		const source = document.createElement('div')
		const node = document.createElement('aside')
		let hostElement: HTMLDivElement | null = null
		source.append(node)
		document.body.append(source)
		const host: GooOverlayHost = {
			element: () => hostElement,
			scope: () => source
		}

		const action = portalToGooOverlayHost(node, host)
		expect(node.parentElement).toBe(source)

		hostElement = document.createElement('div')
		document.body.append(hostElement)
		await Promise.resolve()

		expect(node.parentElement).toBe(hostElement)

		action.destroy()
	})
})
