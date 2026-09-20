import { alpha, createTheme, darken } from '@mui/material/styles'
import { brand } from './brand'
import { components } from './components'

const baseTheme = createTheme({
  palette: {
    primary: {
      main: brand.colors.primary,
      light: brand.colors.lightBlue,
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
      secondary: alpha(brand.colors.text, 0.72),
    },
    divider: alpha(brand.colors.text, 0.12),
    action: {
      hover: alpha(brand.colors.primary, 0.06),
      selected: brand.colors.lightBlue,
      focus: alpha(brand.colors.primary, 0.16),
    },
  },
  typography: {
    fontFamily: brand.typography.body,
    h1: { fontFamily: brand.typography.display },
    h2: { fontFamily: brand.typography.display },
    h3: { fontFamily: brand.typography.display, fontWeight: 700, letterSpacing: '-1.1px', lineHeight: 1.15 },
    h4: { fontFamily: brand.typography.display, fontWeight: 700, letterSpacing: '-.6px', lineHeight: 1.2 },
    h5: { fontFamily: brand.typography.display },
    h6: { fontFamily: brand.typography.display, fontWeight: 600, lineHeight: 1.3 },
    subtitle1: { fontFamily: brand.typography.display },
    subtitle2: { fontFamily: brand.typography.display },
    body1: { lineHeight: 1.55 },
    body2: { lineHeight: 1.5 },
    button: { fontFamily: brand.typography.display, textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: { fontFamily: brand.typography.display, fontWeight: 700 },
  },
  shape: {
    borderRadius: brand.shape.borderRadius,
  },
})

export const theme = createTheme(baseTheme, {
  components,
})
