import type { Components, Theme } from '@mui/material/styles'

export const card: Components<Theme>['MuiCard'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundImage: 'none',
      borderColor: theme.palette.divider,
      borderRadius: theme.shape.borderRadius,
      transition: theme.transitions.create(['border-color', 'transform'], {
        duration: theme.transitions.duration.shorter,
      }),
    }),
  },
}
