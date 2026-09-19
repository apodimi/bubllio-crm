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
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 36,
          borderRadius: brand.shape.borderRadius * 0.75,
          paddingInline: 14,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        outlined: { borderColor: baseTheme.palette.divider },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderColor: baseTheme.palette.divider },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: brand.shape.borderRadius * 0.75,
          '&.Mui-selected': {
            backgroundColor: baseTheme.palette.action.selected,
            color: baseTheme.palette.primary.main,
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha(baseTheme.palette.primary.main, 0.14),
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: baseTheme.palette.background.paper,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(baseTheme.palette.primary.main, 0.5),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
        notchedOutline: { borderColor: baseTheme.palette.divider },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: brand.shape.borderRadius * 0.5,
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: alpha(baseTheme.palette.primary.main, 0.03),
          color: baseTheme.palette.text.secondary,
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: '0.02em',
        },
        root: { borderColor: alpha(baseTheme.palette.text.primary, 0.08) },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
  },
})
