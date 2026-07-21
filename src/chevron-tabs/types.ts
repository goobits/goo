import type { Snippet } from 'svelte'

export type GooChevronTabStatus =
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'working'
	| 'needsAttention'
	| 'done'
	| 'error'

export type GooChevronTab = {
	id: string
	name: string
	accent?: string
	status?: GooChevronTabStatus | null
	statusUser?: string | null
}

export type GooChevronTabAttributes = Record<string, string | undefined>

export type GooChevronTabsProps = {
	tabs: GooChevronTab[]
	activeId?: string | null
	ariaLabel?: string
	'aria-label'?: string
	addLabel?: string
	addAttributes?: GooChevronTabAttributes
	renameLabel?: string
	showConnectionStatus?: boolean
	allowClosingLastTab?: boolean
	closeLabel?: (_tab: GooChevronTab) => string
	tabAttributes?: (_tab: GooChevronTab, _index: number) => GooChevronTabAttributes
	actions?: Snippet
	onselect?: (_tabId: string) => void
	onadd?: (_event: MouseEvent) => void
	onclose?: (_tabId: string) => void
	onrename?: (_tabId: string, _name: string) => void
	onmove?: (_tabId: string, _targetIndex: number) => void
} & Record<`data-${ string }`, string | undefined>
