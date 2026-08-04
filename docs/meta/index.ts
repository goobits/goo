/** Package-owned, auto-discovered metadata consumed by the Goo docs app. */

export interface GooDocsMetadata {
	readonly id: string
	readonly [key: string]: unknown
}

const modules = import.meta.glob<GooDocsMetadata>('./goo-*.ts', {
	eager: true,
	import: 'default'
})

export const gooDocsMetadata = Object.entries(modules)
	.sort(([ left ], [ right ]) => left.localeCompare(right))
	.map(([, metadata ]) => metadata)
