import type { Components, Theme } from '@mui/material/styles'

export const dialogActions: Components<Theme>['MuiDialogActions'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      gap: theme.spacing(1),
      padding: theme.spacing(2, 3, 3),
      '& > :not(style) ~ :not(style)': { marginLeft: 0 },
    }),
  },
}
