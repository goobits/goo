export type GooChevronTabStatus =
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'working'
	| 'done'
	| 'needsAttention'

export type GooChevronTab = {
	id: string
	name: string
	accent?: string
	status?: GooChevronTabStatus | null
	statusUser?: string
}

export type GooChevronTabAttributes = Record<string, string | undefined>
export type GooChevronDropTargetAttributes = Record<string, string | undefined>
