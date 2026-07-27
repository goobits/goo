<script lang="ts">
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'

import { GooButton } from '../index.ts'

const handleAnchorKeydown: NonNullable<HTMLAnchorAttributes['onkeydown']> = event => {
	if (event.currentTarget.href) event.preventDefault()
}

const handleButtonKeydown: NonNullable<HTMLButtonAttributes['onkeydown']> = event => {
	if (event.currentTarget.form) event.preventDefault()
}
</script>

<form id="profile"></form>
<GooButton
	autofocus
	form="profile"
	formaction="/profile"
	formmethod="post"
	formValue="save"
	name="intent"
	onkeydown={handleButtonKeydown}
>
	Save
</GooButton>
<GooButton
	aria-label="Download invoice"
	download="invoice.pdf"
	href="/billing"
	hreflang="en"
	onkeydown={handleAnchorKeydown}
	referrerpolicy="no-referrer"
>
	Download
</GooButton>
