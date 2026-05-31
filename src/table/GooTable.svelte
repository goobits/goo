<script lang="ts" generics="T">
import { GooDataGrid } from '../data-grid/index.ts'
import type { GooTableProps } from './types.ts'

let {
	sortable = true,
	...gridProps
}: GooTableProps<T> = $props()
</script>

<GooDataGrid {...gridProps} sortable={sortable} />
