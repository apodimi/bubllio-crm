import type { Components, Theme } from '@mui/material/styles'

export const cssBaseline: Components<Theme>['MuiCssBaseline'] = {
  styleOverrides: {
    html: { scrollBehavior: 'smooth' },
    body: {
      WebkitFontSmoothing: 'antialiased',
      backgroundImage: 'none',
    },
    '::selection': { background: 'rgba(0,91,239,.2)' },
  },
}
