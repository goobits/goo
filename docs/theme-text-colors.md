# Theme Text Colors

## Hierarchy

Use these on standard backgrounds (`--goo-theme-bg`, `--goo-theme-surface-*`):

| Variable                    | Use            |
| --------------------------- | -------------- |
| `--goo-theme-fg`            | Primary text   |
| `--goo-theme-muted`         | Secondary text |
| `--goo-theme-text-disabled` | Disabled text  |

Aliases:

- `--goo-theme-text-primary` → `--goo-theme-fg`
- `--goo-theme-text-secondary` → `--goo-theme-muted`

## Text on colored backgrounds

Each background has a paired `-fg` for contrast:

`--goo-theme-accent-fg`, `--goo-theme-selected-fg`, `--goo-theme-secondary-fg`,
`--goo-theme-positive-fg`, `--goo-theme-negative-fg`, `--goo-theme-warning-fg`.

Muted text on colored backgrounds:

```css
color: color-mix(in srgb, var(--goo-theme-accent-fg) 70%, transparent);
```

## Do / Don't

```css
/* DO */
.my-component {
	color: var(--goo-theme-fg);
}
.my-component__hint {
	color: var(--goo-theme-muted);
}

/* DON'T */
.my-component {
	color: var(--goo-theme-fg);
	opacity: 0.5;
}
```
