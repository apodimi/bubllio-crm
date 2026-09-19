import { alpha, createTheme, darken, lighten } from '@mui/material/styles'
import { brand } from './brand'
import { components } from './components'

const baseTheme = createTheme({
  palette: {
    primary: {
      main: brand.colors.primary,
      light: lighten(brand.colors.primary, 0.82),
      dark: darken(brand.colors.primary, 0.35),
    },
    secondary: {
      main: brand.colors.secondary,
    },
    background: {
      default: brand.colors.background,
      paper: brand.colors.surface,
    },
    text: {
      primary: brand.colors.text,
      secondary: brand.colors.textMuted,
    },
    divider: alpha(brand.colors.text, 0.12),
    action: {
      hover: alpha(brand.colors.primary, 0.06),
      selected: alpha(brand.colors.primary, 0.1),
      focus: alpha(brand.colors.primary, 0.16),
    },
  },
  typography: {
    fontFamily: brand.typography.fontFamily,
    h3: { fontWeight: 700, letterSpacing: '-1.1px', lineHeight: 1.15 },
    h4: { fontWeight: 700, letterSpacing: '-.6px', lineHeight: 1.2 },
    h6: { fontWeight: 650, lineHeight: 1.3 },
    body1: { lineHeight: 1.55 },
    body2: { lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  shape: {
    borderRadius: brand.shape.borderRadius,
  },
})

export const theme = createTheme(baseTheme, {
  components,
})
