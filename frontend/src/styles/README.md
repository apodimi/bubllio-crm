# Theme and brand customization

The frontend uses one centralized Material UI theme. A developer changing the
brand should start with `brand.ts` and should not edit individual pages.

The default visual direction is Atlassian-inspired: professional blue actions,
blue-gray neutrals, compact controls, clear focus states, restrained borders,
and minimal elevation. It is an original Bubllio theme, not a copy of another
product's components or branding.

## Quick customization

Change the base values in `brand.ts`:

```ts
export const brand = {
  colors: {
    primary: '#0c66e4',
    secondary: '#5e4db2',
    background: '#f7f8f9',
    surface: '#ffffff',
    text: '#172b4d',
    textMuted: '#44546f',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
}
```

`theme.ts` derives primary light/dark variants, dividers, hover, selected,
focus, table, button, and outlined-surface styles from those values. This keeps
the interface coherent when the primary palette changes.

## Rules for developers and coding agents

- Do not add hexadecimal, RGB, or named colors to pages or components.
- Use semantic Material UI paths such as `primary.main`, `text.secondary`,
  `background.paper`, `divider`, and `action.selected`.
- Use an `sx` callback with `alpha`, `lighten`, or `darken` when a derived color
  is needed.
- Put application-wide component defaults in `theme.ts`.
- Put only human-selected brand inputs in `brand.ts`.
- Do not create a second ThemeProvider or feature-specific theme.
- Check contrast when changing primary, surface, or text colors.

## Which file should change?

| Need | File |
|---|---|
| Change the brand palette or font | `brand.ts` |
| Change global MUI component appearance | `theme.ts` |
| Change layout spacing for one screen | the relevant component/page |
| Add a reusable visual component | `components/common/` |

After a theme change, run lint, unit tests, build, and Playwright. Review both
desktop and mobile screenshots because automated tests validate behavior, not
subjective color quality.
