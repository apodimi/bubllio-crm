import { alpha } from '@mui/material/styles'
import type { Components, Theme } from '@mui/material/styles'

export const outlinedInput: Components<Theme>['MuiOutlinedInput'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundColor: theme.palette.background.paper,
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: alpha(theme.palette.primary.main, 0.5),
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderWidth: 2,
      },
    }),
    notchedOutline: ({ theme }) => ({ borderColor: theme.palette.divider }),
  },
}
