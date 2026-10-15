import type { Components, Theme } from '@mui/material/styles'

export const dialogTitle: Components<Theme>['MuiDialogTitle'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3, 3, 1),
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.h5.fontWeight,
    }),
  },
}
