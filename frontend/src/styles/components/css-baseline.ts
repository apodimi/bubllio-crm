import type { Components, Theme } from '@mui/material/styles'

export const cssBaseline: Components<Theme>['MuiCssBaseline'] = {
  styleOverrides: {
    body: { WebkitFontSmoothing: 'antialiased' },
  },
}
