import { alpha, createTheme, darken, lighten } from '@mui/material/styles'
import { brand } from './brand'

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
    h3: { fontWeight: 700, letterSpacing: '-1.2px' },
    h4: { fontWeight: 700, letterSpacing: '-.7px' },
    h6: { fontWeight: 650 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: brand.shape.borderRadius,
  },
})

export const theme = createTheme(baseTheme, {
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: brand.shape.borderRadius * 0.67 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { outlined: { borderColor: baseTheme.palette.divider } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: alpha(baseTheme.palette.primary.main, 0.03),
          color: baseTheme.palette.text.secondary,
          fontWeight: 600,
          fontSize: 12,
        },
        root: { borderColor: alpha(baseTheme.palette.text.primary, 0.08) },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
  },
})
