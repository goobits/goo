import type { Snippet } from 'svelte'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Native Goo button layout mode. */
export type GooButtonLayout = 'inline' | 'stacked'

/** Native link target for anchor-backed Goo buttons. */
export type GooButtonTarget = '_blank' | '_parent' | '_self' | '_top' | (string & {})

/** Native Goo button type. */
export type GooButtonType = 'button' | 'reset' | 'submit'

/** Native Goo button variant. */
export type GooButtonVariant = 'default' | 'primary' | 'secondary' | 'attention' | 'danger' | 'ghost' | 'link' | 'selected' | string

/** Props accepted by the Svelte `GooButton` component. */
export type GooButtonProps = GooForwardedAttributes & {

	/** Visual label rendered when no children are provided. */
	value?: string

	/** Native button form value. */
	formValue?: string

	/** Native button type. */
	type?: GooButtonType

	/** Whether the button is disabled. */
	disabled?: boolean

	/** Link URL. When present, GooButton renders an anchor element. */
	href?: string

	/** Anchor target used when `href` is present. */
	target?: GooButtonTarget

	/** Anchor relationship used when `href` is present. */
	rel?: string

	/** Render as a full-width row button. */
	block?: boolean

	/** Render as a full-width row button. */
	fullRow?: boolean

	/** Optional title/tooltip text. */
	title?: string

	/** Additional tooltip text when title is not provided. */
	tooltip?: string

	/** Accessible label for icon-only buttons. */
	ariaLabel?: string

	/** Explicit pressed state for non-toggle buttons with selectable semantics. */
	ariaPressed?: boolean | 'false' | 'mixed' | 'true'

	/** Visual variant. */
	variant?: GooButtonVariant

	/** Compact/medium size token. */
	size?: string

	/** Render as a square icon button. */
	square?: boolean

	/** Enable toggle semantics. */
	toggle?: boolean

	/** Pressed state for toggle buttons. */
	pressed?: boolean

	/** Layout mode. */
	layout?: GooButtonLayout

	/** Extra class names. */
	class?: string

	/** Inline style. */
	style?: string

	/** Optional icon snippet. */
	icon?: Snippet

	/** Button content. */
	children?: Snippet

	/** Native click callback. */
	onclick?: (event: MouseEvent) => void

	/** Activation callback fired after click/toggle handling. */
	onactivate?: (event: MouseEvent) => void

	/** Toggle change callback. */
	onchange?: (value: boolean, oldValue?: boolean) => void

}
