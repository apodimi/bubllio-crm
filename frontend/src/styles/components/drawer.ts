import type { Components, Theme } from '@mui/material/styles'

export const drawer: Components<Theme>['MuiDrawer'] = {
  styleOverrides: {
    paper: ({ theme }) => ({ borderColor: theme.palette.divider }),
  },
}
