import type { Snippet } from 'svelte'
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'

import type { GooForwardedAttributes } from '../support/types/forwardedAttributes.ts'

/** Native Goo button layout mode. */
export type GooButtonLayout = 'inline' | 'stacked'

/** Native link target for anchor-backed Goo buttons. */
export type GooButtonTarget = '_blank' | '_parent' | '_self' | '_top' | (string & {})

/** Native Goo button type. */
export type GooButtonType = 'button' | 'reset' | 'submit'

/** Native Goo button variant. */
export type GooButtonVariant =
	| 'default'
	| 'primary'
	| 'secondary'
	| 'attention'
	| 'danger'
	| 'ghost'
	| 'link'
	| 'selected'
	| string

type GooButtonOwnProps = GooForwardedAttributes & {
	/** Visual label rendered when no children are provided. */
	value?: string | undefined

	/** Native button form value. */
	formValue?: string | undefined

	/** Native button type. */
	type?: GooButtonType | undefined

	/** Whether the button is disabled. */
	disabled?: boolean | undefined

	/** Link URL. When present, GooButton renders an anchor element. */
	href?: string | undefined

	/** Anchor target used when `href` is present. */
	target?: GooButtonTarget | undefined

	/** Anchor relationship used when `href` is present. */
	rel?: string | undefined

	/** Render as a full-width row button. */
	block?: boolean | undefined

	/** Render as a full-width row button. */
	fullRow?: boolean | undefined

	/** Optional title/tooltip text. */
	title?: string | undefined

	/** Additional tooltip text when title is not provided. */
	tooltip?: string | undefined

	/** Accessible label for icon-only buttons. */
	ariaLabel?: string | undefined

	/** Explicit pressed state for non-toggle buttons with selectable semantics. */
	ariaPressed?: boolean | 'false' | 'mixed' | 'true' | undefined

	/** Visual variant. */
	variant?: GooButtonVariant | undefined

	/** Compact/medium size token. */
	size?: string | undefined

	/** Render as a square icon button. */
	square?: boolean | undefined

	/** Enable toggle semantics. */
	toggle?: boolean | undefined

	/** Pressed state for toggle buttons. */
	pressed?: boolean | undefined

	/** Layout mode. */
	layout?: GooButtonLayout | undefined

	/** Extra class names. */
	class?: string | undefined

	/** Inline style. */
	style?: string | undefined

	/** Optional icon snippet. */
	icon?: Snippet | undefined

	/** Button content. */
	children?: Snippet | undefined

	/** Native click callback. */
	onclick?: ((event: MouseEvent) => void) | undefined

	/** Activation callback fired after click/toggle handling. */
	onactivate?: ((event: MouseEvent) => void) | undefined

	/** Toggle change callback. */
	onchange?: ((value: boolean, oldValue?: boolean) => void) | undefined
}

/** Props for a native button-backed `GooButton`. */
export type GooButtonButtonProps = GooButtonOwnProps &
	Omit<HTMLButtonAttributes, keyof GooButtonOwnProps | 'href'> & { href?: undefined }

/** Props for a native anchor-backed `GooButton`. */
export type GooButtonAnchorProps = GooButtonOwnProps &
	Omit<HTMLAnchorAttributes, keyof GooButtonOwnProps | 'href'> & { href: string }

/**
 * Props accepted by the Svelte `GooButton` component.
 *
 * Native button attributes are accepted when `href` is absent. Native anchor
 * attributes are accepted when `href` is present.
 */
export type GooButtonProps = GooButtonButtonProps | GooButtonAnchorProps
