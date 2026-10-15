import type { Components, Theme } from '@mui/material/styles'

export const tableRow: Components<Theme>['MuiTableRow'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      transition: theme.transitions.create('background-color', {
        duration: theme.transitions.duration.shortest,
      }),
      '&.MuiTableRow-hover:hover': { backgroundColor: theme.palette.action.hover },
    }),
  },
}
