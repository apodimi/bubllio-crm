import { alpha, type Components, type Theme } from '@mui/material/styles'

export const iconButton: Components<Theme>['MuiIconButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: theme.shape.borderRadius,
      transition: theme.transitions.create(['background-color', 'color', 'transform'], {
        duration: theme.transitions.duration.shorter,
      }),
      '@media (hover: hover) and (pointer: fine)': {
        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.07) },
      },
      '&:active': { transform: 'scale(.96)' },
      '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
    }),
  },
}
