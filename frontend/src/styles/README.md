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
    primary: '#005bef',
    secondary: '#1473ff',
    lightBlue: '#eaf2ff',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
}
```

The default Bubllio palette maps Core Blue to `primary`, Bright Blue to
`secondary`, Light Blue to soft and selected surfaces, Off White to the page
background, and Charcoal to primary text. Muted text, dividers, hover, focus,
and dark variants are derived from these colors rather than added as unrelated
palette values.

`theme.ts` derives primary light/dark variants, dividers, hover, selected, and
focus colors from those values. Application-wide MUI component overrides live
in `components/`, with exactly one component per file. This keeps the interface
coherent when the primary palette changes and makes each override easy to find.

## Component override structure

```text
styles/
├── brand.ts                 Human-selected brand inputs
├── theme.ts                 Palette, typography, shape, and theme composition
└── components/
    ├── button.ts            MuiButton defaults and styles
    ├── input-label.ts       MuiInputLabel states and typography
    ├── outlined-input.ts    Shared input surface and interaction states
    ├── table-cell.ts        MuiTableCell defaults and styles
    ├── ...
    └── index.ts             Maps local overrides to MUI component keys
```

When adding a global override, create a file named after the MUI component in
kebab-case and register it in `components/index.ts`. Export a typed
`Components<Theme>['MuiComponentName']` object and use the callback `theme`
argument for palette, shape, spacing, or typography values.

## Rules for developers and coding agents

- Do not add hexadecimal, RGB, or named colors to pages or components.
- Use semantic Material UI paths such as `primary.main`, `text.secondary`,
  `background.paper`, `divider`, and `action.selected`.
- Use an `sx` callback with `alpha`, `lighten`, or `darken` when a derived color
  is needed.
- Put each application-wide component override in its own file under
  `components/` and register it in `components/index.ts`.
- Put only human-selected brand inputs in `brand.ts`.
- Do not create a second ThemeProvider or feature-specific theme.
- Check contrast when changing primary, surface, or text colors.

## Which file should change?

| Need | File |
|---|---|
| Change the brand palette or font | `brand.ts` |
| Change global MUI component appearance | its file in `components/` |
| Register a new global MUI override | `components/index.ts` |
| Change layout spacing for one screen | the relevant component/page |
| Add a reusable visual component | `components/common/` |

After a theme change, run lint, unit tests, build, and Playwright. Review both
desktop and mobile screenshots because automated tests validate behavior, not
subjective color quality.
