import { alpha } from '@mui/material/styles'
import type { Components, Theme } from '@mui/material/styles'

export const outlinedInput: Components<Theme>['MuiOutlinedInput'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundColor: theme.palette.background.paper,
      borderRadius: 6,
      transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
        duration: theme.transitions.duration.shorter,
      }),
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: alpha(theme.palette.text.primary, 0.42),
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.14)}`,
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: 1,
        },
      },
      '&.Mui-error': {
        '&.Mui-focused': {
          boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.12)}`,
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.error.main,
        },
      },
      '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
      },
    }),
    input: {
      '&::placeholder': {
        opacity: 0.72,
      },
    },
    notchedOutline: ({ theme }) => ({
      borderColor: alpha(theme.palette.text.primary, 0.22),
      '& legend': {
        maxWidth: 0,
      },
    }),
  },
}
