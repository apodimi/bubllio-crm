import type { Components, Theme } from '@mui/material/styles'

export const card: Components<Theme>['MuiCard'] = {
  styleOverrides: {
    root: { backgroundImage: 'none' },
  },
}
