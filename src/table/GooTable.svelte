<script lang="ts" generics="T">
import { GooDataGrid } from '../data-grid/index.js'
import type { GooTableProps } from './types.js'

let {
	sortable = true,
	...gridProps
}: GooTableProps<T> = $props()
</script>

<GooDataGrid {...gridProps} sortable={sortable} />
